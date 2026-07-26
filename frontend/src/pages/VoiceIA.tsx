import { useState, useRef, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Mic, MicOff, Send, Volume2, Sparkles, CheckCircle2, XCircle, FileText, Loader2, VolumeX } from 'lucide-react';
import api from '@/services/api';

interface Item {
  codigo: string;
  descripcion: string;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
  igv: number;
  total: number;
}

interface Intencion {
  tipo_comprobante_nombre: string;
  tipo_comprobante_sunat: string;
  serie: string;
  numero: number;
  cliente_denominacion: string;
  cliente_numero_de_documento: string;
  total_gravada: number;
  total_igv: number;
  total: number;
  items: Item[];
  texto_original: string;
}

interface ProcessResponse {
  conversacion_id: number;
  estado: string;
  transcripcion: string;
  asistente_respuesta: string;
  intencion?: Intencion;
  tiempo_procesamiento_ms: number;
  tts?: {
    audio_base64?: string | null;
    usar_web_speech_api?: boolean;
  };
}

interface ChatLog {
  role: 'user' | 'assistant';
  text: string;
}

export default function VoiceIA() {
  const [isListening, setIsListening] = useState(false);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isEmitting, setIsEmitting] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [session, setSession] = useState<ProcessResponse | null>(null);
  const [chatLogs, setChatLogs] = useState<ChatLog[]>([
    {
      role: 'assistant',
      text: '¡Hola! Soy tu Asistente de Facturación por Voz. Presiona el micrófono y dictame: "Emitir factura para Fibertel por 2 Routers Mikrotik a 150 soles".',
    },
  ]);

  const recognitionRef = useRef<any>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const chatBottomRef = useRef<HTMLDivElement | null>(null);
  const isMountedRef = useRef<boolean>(true);
  const sessionRef = useRef<ProcessResponse | null>(null);

  // Mantener la sesión sincronizada para callbacks
  useEffect(() => {
    sessionRef.current = session;
  }, [session]);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatLogs, isLoading, isListening]);

  useEffect(() => {
    isMountedRef.current = true;

    // Inicializar Web Speech Recognition API
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false; // Se detiene al terminar la frase
      recognition.interimResults = true; // Transcripción en tiempo real mientras hablas
      recognition.lang = 'es-PE'; // Idioma

      recognition.onstart = () => {
        if (isMountedRef.current) setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        if (isMountedRef.current) {
          setInputText(currentTranscript);
        }
      };

      recognition.onerror = (event: any) => {
        console.error('Error en reconocimiento de voz:', event.error);
        if (isMountedRef.current) {
          setIsListening(false);
          if (event.error !== 'no-speech') {
            toast.error('Error al escuchar el micrófono.');
          }
        }
      };

      recognition.onend = () => {
        if (isMountedRef.current) {
          setIsListening(false);
        }
      };

      recognitionRef.current = recognition;
    } else {
      toast.warning('Tu navegador no soporta transcripción en vivo. Usa Google Chrome o Edge.');
    }

    return () => {
      isMountedRef.current = false;
      detenerVoz();
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  const hablarWebSpeech = useCallback((texto: string) => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(texto);
      utterance.lang = 'es-PE';
      utterance.rate = 1.0;
      utterance.onstart = () => isMountedRef.current && setIsSpeaking(true);
      utterance.onend = () => isMountedRef.current && setIsSpeaking(false);
      utterance.onerror = () => isMountedRef.current && setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
    }
  }, []);

  const detenerVoz = useCallback(() => {
    if ('speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
      audioPlayerRef.current.currentTime = 0;
      audioPlayerRef.current = null;
    }
    if (isMountedRef.current) {
      setIsSpeaking(false);
    }
  }, []);

  const reproducirVozAsistente = useCallback((texto: string, audioBase64?: string | null) => {
    detenerVoz();

    if (audioBase64) {
      const src = audioBase64.startsWith('data:') 
        ? audioBase64 
        : `data:audio/mp3;base64,${audioBase64}`;

      const audio = new Audio(src);
      audioPlayerRef.current = audio;
      setIsSpeaking(true);
      
      audio.onended = () => isMountedRef.current && setIsSpeaking(false);
      audio.onerror = () => {
        if (isMountedRef.current) setIsSpeaking(false);
        hablarWebSpeech(texto);
      };

      audio.play().catch(() => hablarWebSpeech(texto));
      return;
    }

    hablarWebSpeech(texto);
  }, [detenerVoz, hablarWebSpeech]);

  // 🎤 INICIAR / DETENER ESCUCHA EN VIVO
  const toggleListening = () => {
    detenerVoz();
    if (!recognitionRef.current) {
      toast.error('El reconocimiento de voz no está disponible en este navegador.');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      setInputText('');
      try {
        recognitionRef.current.start();
      } catch (err) {
        recognitionRef.current.stop();
      }
    }
  };

  // 📝 ENVÍA EL TEXTO YA TRANCRITO DIRECTAMENTE A LA IA
  const enviarTexto = async (textoAEnviar?: string) => {
    const texto = textoAEnviar || inputText;
    if (!texto.trim()) return;

    detenerVoz();
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
    }

    setIsLoading(true);
    setChatLogs((prev) => [...prev, { role: 'user', text: texto }]);

    try {
      const payload: { texto: string; conversacion_id?: number } = { texto };
      if (sessionRef.current?.conversacion_id) {
        payload.conversacion_id = sessionRef.current.conversacion_id;
      }

      const res = await api.post('/v1/voice/procesar-audio', payload);
      if (!isMountedRef.current) return;

      if (res.data.success) {
        const data: ProcessResponse = res.data.data;

        if (data.estado === 'completada') {
          setChatLogs((prev) => [...prev, { role: 'assistant', text: `✅ ${data.asistente_respuesta}` }]);
          reproducirVozAsistente(data.asistente_respuesta, data.tts?.audio_base64);
          toast.success('Comprobante emitido exitosamente.');
          setSession(null);
        } else {
          setSession(data);
          setChatLogs((prev) => [...prev, { role: 'assistant', text: data.asistente_respuesta }]);
          reproducirVozAsistente(data.asistente_respuesta, data.tts?.audio_base64);
        }
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        toast.error('Error al procesar: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      if (isMountedRef.current) {
        setIsLoading(false);
        setInputText('');
      }
    }
  };

  const confirmarEmision = async () => {
    if (!session) return;
    detenerVoz();
    setIsEmitting(true);
    try {
      const res = await api.post('/v1/voice/confirmar-emision', {
        conversacion_id: session.conversacion_id,
      });

      if (!isMountedRef.current) return;

      if (res.data.success) {
        const msg = res.data.message || 'Comprobante emitido con éxito.';
        setChatLogs((prev) => [...prev, { role: 'assistant', text: `✅ ${msg}` }]);
        reproducirVozAsistente('Operación completada exitosamente. El comprobante ha sido emitido.');
        toast.success(msg);
        setSession(null);
      }
    } catch (error: any) {
      if (isMountedRef.current) {
        toast.error('Error en la emisión: ' + (error.response?.data?.message || error.message));
      }
    } finally {
      if (isMountedRef.current) {
        setIsEmitting(false);
      }
    }
  };

  const cancelarEmision = async () => {
    if (!session) return;
    detenerVoz();
    try {
      await api.post('/v1/voice/cancelar', { conversacion_id: session.conversacion_id });
      if (isMountedRef.current) {
        setChatLogs((prev) => [...prev, { role: 'assistant', text: '❌ Emisión cancelada.' }]);
        reproducirVozAsistente('Emisión cancelada.');
        setSession(null);
        toast.info('Operación cancelada.');
      }
    } catch {
      if (isMountedRef.current) {
        setSession(null);
      }
    }
  };

  return (
    <div className="container mx-auto p-4 md:p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-700 p-6 rounded-2xl text-white shadow-lg">
        <div>
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 text-yellow-300 animate-pulse" />
            <h1 className="text-2xl font-bold">Voice IA — Facturación por Voz</h1>
          </div>
          <p className="text-blue-100 text-sm mt-1">
            Transcripción automática en tiempo real integrada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {isSpeaking && (
            <Button
              variant="secondary"
              size="sm"
              onClick={detenerVoz}
              className="bg-rose-500 hover:bg-rose-600 text-white gap-1 text-xs"
            >
              <VolumeX className="h-4 w-4" /> Detener Voz
            </Button>
          )}
          <Badge variant="secondary" className="px-3 py-1.5 bg-white/20 text-white border-none font-medium">
            Transcripción Directa Activa
          </Badge>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Chat / Comandos de Voz */}
        <div className="lg:col-span-6 space-y-4">
          <Card className="h-[480px] flex flex-col shadow-sm border-slate-200">
            <CardHeader className="pb-3 border-b bg-slate-50/50 flex flex-row items-center justify-between">
              <CardTitle className="text-base flex items-center gap-2">
                <Volume2 className={`h-4 w-4 ${isSpeaking ? 'text-emerald-600 animate-bounce' : 'text-primary'}`} /> Diálogo Asistido
              </CardTitle>
              {isSpeaking && (
                <Badge className="bg-emerald-100 text-emerald-800 border-emerald-200 animate-pulse text-xs">
                  🔊 Asistente Hablando...
                </Badge>
              )}
            </CardHeader>

            <CardContent className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatLogs.map((log, i) => (
                <div
                  key={i}
                  className={`flex ${log.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm shadow-xs ${
                      log.role === 'user'
                        ? 'bg-indigo-600 text-white font-medium space-y-1'
                        : 'bg-slate-100 text-slate-800 border border-slate-200'
                    }`}
                  >
                    <div>{log.text}</div>
                  </div>
                </div>
              ))}

              {isListening && (
                <div className="flex justify-end">
                  <div className="bg-indigo-500/10 text-indigo-700 border border-indigo-200 rounded-2xl px-4 py-2 text-xs flex items-center gap-2 animate-pulse font-medium">
                    <Mic className="h-3.5 w-3.5 text-indigo-600" /> Escuchando tu voz...
                  </div>
                </div>
              )}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-slate-100 text-slate-600 rounded-2xl px-4 py-2.5 text-sm flex items-center gap-2 border border-slate-200">
                    <Loader2 className="h-4 w-4 animate-spin text-indigo-600" /> 
                    <span>Procesando solicitud...</span>
                  </div>
                </div>
              )}
              <div ref={chatBottomRef} />
            </CardContent>

            <CardFooter className="p-3 border-t bg-slate-50/50 flex gap-2">
              <Input
                placeholder={isListening ? "Escuchando..." : session ? "Escribe 'confirmar' o presiona el micrófono..." : "Factura para Fibertel por 2 routers..."}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && enviarTexto()}
                disabled={isLoading}
                className="bg-white"
              />
              <Button
                variant={isListening ? 'destructive' : 'default'}
                size="icon"
                onClick={toggleListening}
                disabled={isLoading}
                className="shrink-0"
                title={isListening ? 'Detener micrófono' : 'Hablar por micrófono'}
              >
                {isListening ? <MicOff className="h-5 w-5 animate-pulse" /> : <Mic className="h-5 w-5" />}
              </Button>
              <Button
                size="icon"
                onClick={() => enviarTexto()}
                disabled={isLoading || !inputText.trim()}
                className="shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </CardFooter>
          </Card>
        </div>

        {/* Card de Confirmación Visual */}
        <div className="lg:col-span-6">
          {session && session.intencion ? (
            <Card className="border-2 border-indigo-500 shadow-md bg-white">
              <CardHeader className="bg-indigo-50/80 pb-3 border-b border-indigo-100">
                <div className="flex justify-between items-center">
                  <Badge className="bg-indigo-600 text-white font-semibold">
                    {session.intencion.tipo_comprobante_nombre} ({session.intencion.serie}-{session.intencion.numero})
                  </Badge>
                  <span className="text-xs text-indigo-700 font-medium">
                    Procesado en {session.tiempo_procesamiento_ms} ms
                  </span>
                </div>
                <CardTitle className="text-lg mt-2 text-indigo-950 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-indigo-600" /> Confirmar Emisión por Voz
                </CardTitle>
                <CardDescription className="text-indigo-900 text-xs">
                  Revisa los datos reconocidos. Di <b>"confirmar"</b> por micrófono o haz clic abajo.
                </CardDescription>
              </CardHeader>

              <CardContent className="p-4 space-y-4 text-sm">
                <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 space-y-1">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Cliente Reconocido</div>
                  <div className="font-bold text-slate-900">{session.intencion.cliente_denominacion}</div>
                  <div className="text-xs text-slate-600">Doc: {session.intencion.cliente_numero_de_documento}</div>
                </div>

                <div className="space-y-2">
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Detalle de Productos</div>
                  <div className="border border-slate-200 rounded-lg overflow-hidden">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-slate-100 text-slate-700 font-semibold border-b">
                        <tr>
                          <th className="p-2">Cant</th>
                          <th className="p-2">Descripción</th>
                          <th className="p-2 text-right">P. Unit</th>
                          <th className="p-2 text-right">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {session.intencion.items.map((item, idx) => (
                          <tr key={idx}>
                            <td className="p-2 font-bold">{item.cantidad}</td>
                            <td className="p-2">{item.descripcion}</td>
                            <td className="p-2 text-right">S/ {item.precio_unitario.toFixed(2)}</td>
                            <td className="p-2 text-right font-semibold">S/ {item.total.toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-3 rounded-lg border border-indigo-100 space-y-1 text-right">
                  <div className="text-xs text-slate-600">Op. Gravada: S/ {session.intencion.total_gravada.toFixed(2)}</div>
                  <div className="text-xs text-slate-600">IGV (18%): S/ {session.intencion.total_igv.toFixed(2)}</div>
                  <div className="text-base font-extrabold text-indigo-900">
                    TOTAL: S/ {session.intencion.total.toFixed(2)}
                  </div>
                </div>
              </CardContent>

              <CardFooter className="p-4 border-t bg-slate-50 flex justify-between gap-3">
                <Button variant="outline" onClick={cancelarEmision} disabled={isEmitting} className="w-1/2">
                  <XCircle className="h-4 w-4 mr-2 text-rose-500" /> Cancelar
                </Button>
                <Button
                  onClick={confirmarEmision}
                  disabled={isEmitting}
                  className="w-1/2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                >
                  {isEmitting ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <CheckCircle2 className="h-4 w-4 mr-2" />
                  )}
                  Confirmar y Emitir
                </Button>
              </CardFooter>
            </Card>
          ) : (
            <Card className="h-[480px] flex flex-col items-center justify-center text-center p-6 border-dashed border-2 border-slate-200 bg-slate-50/50">
              <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 mb-4 animate-bounce">
                <Mic className="h-8 w-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-800">Esperando Comando por Voz</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                Haz clic en el micrófono. Lo que hables se escribirá en el campo de texto en tiempo real y podrás enviarlo con un clic o presionar Enter.
              </p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}