'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Building2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/components/ui/use-toast'

const loginSchema = z.object({
  email: z.string().email('Email invalide'),
  password: z.string().min(6, 'Minimum 6 caractères'),
})
type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()
  const { toast } = useToast()

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  async function onSubmit(data: LoginForm) {
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })
    
    console.log("RESULT:", data)
    console.log("ERROR:", error)
    
    if (error) {
      toast({
        variant: 'destructive',
        title: 'Connexion échouée',
        description: 'Email ou mot de passe incorrect.',
      })
      setLoading(false)
      return
    }
    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-100 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary shadow-lg shadow-primary/25 mb-5">
            <Building2 className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">HotelScope</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            Plateforme hôtelière pour agences de voyage
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl border shadow-sm p-8">
          <h2 className="text-lg font-semibold mb-6">Connexion</h2>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="vous@agence.com"
                {...register('email')}
                className={errors.email ? 'border-destructive' : ''}
              />
              {errors.email && (
                <p className="text-xs text-destructive">{errors.email.message}</p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Mot de passe</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className={errors.password ? 'border-destructive' : ''}
              />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Connexion…</>
              ) : (
                'Se connecter'
              )}
            </Button>
          </form>

          <div className="mt-6 pt-5 border-t">
            <p className="text-xs text-muted-foreground text-center">
              Compte de démonstration
            </p>
            <div className="mt-2 p-3 bg-muted/50 rounded-lg text-xs text-muted-foreground space-y-1">
              <div><span className="font-medium">Email :</span> demo@hotelscope.com</div>
              <div><span className="font-medium">Mot de passe :</span> demo123456</div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          © 2024 HotelScope — Tous droits réservés
        </p>
      </div>
    </div>
  )
}
