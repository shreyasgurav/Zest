declare module '@/components/ui/card' {
  import { HTMLAttributes } from 'react'
  
  export interface CardProps extends HTMLAttributes<HTMLDivElement> {}
  export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {}
  
  export const Card: React.ForwardRefExoticComponent<CardProps & React.RefAttributes<HTMLDivElement>>
  export const CardContent: React.ForwardRefExoticComponent<CardContentProps & React.RefAttributes<HTMLDivElement>>
}

declare module '@/components/ui/button' {
  import { ButtonHTMLAttributes } from 'react'
  
  export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'default' | 'outline' | 'ghost'
    size?: 'default' | 'sm' | 'lg' | 'icon'
    asChild?: boolean
  }
  
  export const Button: React.ForwardRefExoticComponent<ButtonProps & React.RefAttributes<HTMLButtonElement>>
} 