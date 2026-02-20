import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import logoUrl from '@/assets/nubofact_logo_2026__a (1).png';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, User, Lock, UserPlus, LogIn, AlertCircle, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';

// ─── Schemas ────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1, 'Ingresa tu usuario'),
  password: z.string().min(1, 'Ingresa tu contraseña'),
});

const registerSchema = z
  .object({
    name: z
      .string()
      .min(2, 'El nombre debe tener al menos 2 caracteres')
      .max(100, 'El nombre es demasiado largo')
      .regex(/^[a-zA-ZÀ-ÿ\s]+$/, 'Solo se permiten letras y espacios'),
    username: z
      .string()
      .min(3, 'Mínimo 3 caracteres')
      .max(30, 'Máximo 30 caracteres')
      .regex(/^[a-zA-Z][a-zA-Z0-9_.]*$/, 'Debe comenzar con una letra. Solo letras, números, puntos y guiones bajos.'),
    password: z
      .string()
      .min(8, 'Mínimo 8 caracteres')
      .regex(/[A-Z]/, 'Debe contener al menos una mayúscula')
      .regex(/[0-9]/, 'Debe contener al menos un número'),
    passwordConfirmation: z.string().min(1, 'Confirma tu contraseña'),
  })
  .refine((d) => d.password === d.passwordConfirmation, {
    message: 'Las contraseñas no coinciden',
    path: ['passwordConfirmation'],
  });

type LoginData = z.infer<typeof loginSchema>;
type RegisterData = z.infer<typeof registerSchema>;

// ─── Sub-components ──────────────────────────────────────────────────────────

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="flex items-center gap-1 text-xs text-destructive mt-1">
      <AlertCircle className="h-3 w-3 shrink-0" />
      {message}
    </p>
  );
}

function PasswordInput({
  id,
  placeholder,
  registration,
  hasError,
}: {
  id: string;
  placeholder: string;
  registration: React.InputHTMLAttributes<HTMLInputElement>;
  hasError?: boolean;
}) {
  const [show, setShow] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        type={show ? 'text' : 'password'}
        placeholder={placeholder}
        autoComplete={id === 'password' ? 'current-password' : 'new-password'}
        aria-invalid={hasError}
        className={cn(
          'w-full h-10 pl-10 pr-10 rounded-lg border bg-background/50 text-sm transition-all outline-none',
          'placeholder:text-muted-foreground/60',
          'focus:border-primary focus:ring-2 focus:ring-primary/20',
          hasError
            ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
            : 'border-border hover:border-muted-foreground/40'
        )}
        {...registration}
      />
      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <button
        type="button"
        tabIndex={-1}
        onClick={() => setShow((s) => !s)}
        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
        aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
      >
        {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
      </button>
    </div>
  );
}

function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Una mayúscula', ok: /[A-Z]/.test(password) },
    { label: 'Un número', ok: /[0-9]/.test(password) },
  ];
  const score = checks.filter((c) => c.ok).length;
  const barColor = score === 1 ? 'bg-destructive' : score === 2 ? 'bg-warning' : 'bg-success';

  return (
    <div className="mt-2 space-y-1.5">
      <div className="flex gap-1">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className={cn(
              'h-1 flex-1 rounded-full transition-all duration-300',
              i < score ? barColor : 'bg-border'
            )}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1">
            <CheckCircle2
              className={cn(
                'h-3 w-3 transition-colors',
                c.ok ? 'text-success' : 'text-muted-foreground/40'
              )}
            />
            <span className={cn('text-[10px]', c.ok ? 'text-foreground' : 'text-muted-foreground/60')}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Login Form ──────────────────────────────────────────────────────────────

function LoginForm({ onSuccess }: { onSuccess: () => void }) {
  const { login, loading } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginData) => {
    setServerError('');
    try {
      await login(data.username, data.password);
      onSuccess();
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        'Error al iniciar sesión.';
      setServerError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Usuario */}
      <div>
        <label htmlFor="login-username" className="block text-sm font-medium text-foreground mb-1.5">
          Usuario
        </label>
        <div className="relative">
          <input
            id="login-username"
            type="text"
            autoComplete="username"
            placeholder="tu_usuario"
            aria-invalid={!!errors.username}
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-lg border bg-background/50 text-sm transition-all outline-none',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              errors.username
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border hover:border-muted-foreground/40'
            )}
            {...register('username')}
          />
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <FieldError message={errors.username?.message} />
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="password" className="block text-sm font-medium text-foreground mb-1.5">
          Contraseña
        </label>
        <PasswordInput
          id="password"
          placeholder="••••••••"
          hasError={!!errors.password}
          registration={register('password')}
        />
        <FieldError message={errors.password?.message} />
      </div>

      {/* Error de servidor */}
      {serverError && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
        ) : (
          <LogIn className="h-4 w-4" />
        )}
        {loading ? 'Ingresando…' : 'Ingresar'}
      </button>
    </form>
  );
}

// ─── Register Form ────────────────────────────────────────────────────────────

function RegisterForm({ onSuccess }: { onSuccess: () => void }) {
  const { register: registerUser, loading } = useAuth();
  const [serverError, setServerError] = useState('');

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<RegisterData>({ resolver: zodResolver(registerSchema) });

  const passwordValue = useWatch({ control, name: 'password', defaultValue: '' });

  const onSubmit = async (data: RegisterData) => {
    setServerError('');
    try {
      await registerUser(data.name, data.username, data.password, data.passwordConfirmation);
      onSuccess();
    } catch (err: unknown) {
      const errData = (err as { response?: { data?: { message?: string; errors?: Record<string, string[]> } } })?.response
        ?.data;
      const msg =
        errData?.message ??
        (errData?.errors ? Object.values(errData.errors).flat()[0] : undefined) ??
        'Error al crear la cuenta.';
      setServerError(msg);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Nombre */}
      <div>
        <label htmlFor="reg-name" className="block text-sm font-medium text-foreground mb-1.5">
          Nombre completo
        </label>
        <div className="relative">
          <input
            id="reg-name"
            type="text"
            autoComplete="name"
            placeholder="Juan García"
            aria-invalid={!!errors.name}
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-lg border bg-background/50 text-sm transition-all outline-none',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              errors.name
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border hover:border-muted-foreground/40'
            )}
            {...register('name')}
          />
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        <FieldError message={errors.name?.message} />
      </div>

      {/* Usuario */}
      <div>
        <label htmlFor="reg-username" className="block text-sm font-medium text-foreground mb-1.5">
          Usuario
        </label>
        <div className="relative">
          <input
            id="reg-username"
            type="text"
            autoComplete="username"
            placeholder="juan_garcia"
            aria-invalid={!!errors.username}
            className={cn(
              'w-full h-10 pl-10 pr-3 rounded-lg border bg-background/50 text-sm transition-all outline-none',
              'placeholder:text-muted-foreground/60',
              'focus:border-primary focus:ring-2 focus:ring-primary/20',
              errors.username
                ? 'border-destructive focus:border-destructive focus:ring-destructive/20'
                : 'border-border hover:border-muted-foreground/40'
            )}
            {...register('username')}
          />
          <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
        </div>
        {errors.username ? (
          <FieldError message={errors.username.message} />
        ) : (
          <p className="text-xs text-muted-foreground mt-1">
            3–30 caracteres. Letras, números, puntos y guiones bajos.
          </p>
        )}
      </div>

      {/* Contraseña */}
      <div>
        <label htmlFor="reg-password" className="block text-sm font-medium text-foreground mb-1.5">
          Contraseña
        </label>
        <PasswordInput
          id="reg-password"
          placeholder="Mínimo 8 caracteres"
          hasError={!!errors.password}
          registration={register('password')}
        />
        {errors.password ? (
          <FieldError message={errors.password.message} />
        ) : (
          <PasswordStrength password={passwordValue} />
        )}
      </div>

      {/* Confirmar contraseña */}
      <div>
        <label htmlFor="passwordConfirmation" className="block text-sm font-medium text-foreground mb-1.5">
          Confirmar contraseña
        </label>
        <PasswordInput
          id="passwordConfirmation"
          placeholder="Repite la contraseña"
          hasError={!!errors.passwordConfirmation}
          registration={register('passwordConfirmation')}
        />
        <FieldError message={errors.passwordConfirmation?.message} />
      </div>

      {/* Error de servidor */}
      {serverError && (
        <div className="flex items-start gap-2 text-sm text-destructive bg-destructive/8 border border-destructive/20 rounded-lg px-3 py-2.5">
          <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
          <span>{serverError}</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className={cn(
          'w-full h-10 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2',
          'bg-primary text-primary-foreground hover:bg-primary/90 active:scale-[0.98]',
          'disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100'
        )}
      >
        {loading ? (
          <span className="inline-block h-4 w-4 rounded-full border-2 border-primary-foreground/30 border-t-primary-foreground animate-spin" />
        ) : (
          <UserPlus className="h-4 w-4" />
        )}
        {loading ? 'Creando cuenta…' : 'Crear cuenta'}
      </button>
    </form>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type Tab = 'login' | 'register';

export default function Login() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<Tab>('login');

  const handleSuccess = () => navigate('/', { replace: true });

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 py-10">
      {/* Fondo decorativo */}
      <div
        className="pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,var(--tw-gradient-stops))] from-primary/10 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none fixed inset-0 bg-linear-to-b from-muted/20 via-background to-background"
        aria-hidden
      />

      <div className="relative w-full max-w-sm">
        {/* Marca */}
        <div className="text-center mb-4">
          <img
            src={logoUrl}
            alt="Nubofact"
            className="mx-auto max-w-full h-auto max-h-45 object-contain"
          />
          <p className="text-sm text-muted-foreground">Web y Facturador</p>
        </div>

        {/* Card */}
        <div className="bg-card border border-border rounded-2xl shadow-xl shadow-black/10 overflow-hidden">
          {/* Tabs */}
          <div className="flex border-b border-border">
            {(['login', 'register'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveTab(tab)}
                className={cn(
                  'flex-1 py-3.5 text-sm font-medium transition-all relative',
                  activeTab === tab
                    ? 'text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab === 'login' ? 'Iniciar sesión' : 'Registrarse'}
                {/* Indicador activo */}
                {activeTab === tab && (
                  <span className="absolute bottom-0 left-4 right-4 h-0.5 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>

          {/* Formularios */}
          <div className="p-6">
            {activeTab === 'login' ? (
              <LoginForm onSuccess={handleSuccess} />
            ) : (
              <RegisterForm onSuccess={handleSuccess} />
            )}
          </div>

          {/* Footer de la card */}
          <div className="px-6 pb-5 text-center">
            {activeTab === 'login' ? (
              <p className="text-xs text-muted-foreground">
                ¿No tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('register')}
                  className="text-primary hover:underline font-medium"
                >
                  Regístrate
                </button>
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                ¿Ya tienes cuenta?{' '}
                <button
                  type="button"
                  onClick={() => setActiveTab('login')}
                  className="text-primary hover:underline font-medium"
                >
                  Inicia sesión
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground/60 mt-6">
          Facturación electrónica SUNAT · Nubofact
        </p>
      </div>
    </div>
  );
}
