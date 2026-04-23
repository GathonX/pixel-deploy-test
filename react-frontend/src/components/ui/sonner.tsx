import { Toaster as Sonner } from "sonner"

type ToasterProps = React.ComponentProps<typeof Sonner>

// ✅ CORRECTION : Composant Toaster sans dépendance next-themes
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light" // ✅ Thème fixe pour éviter les problèmes d'interactivité
      className="toaster group"
      position="top-right"
      expand={true}
      richColors={true}
      closeButton={true}
      toastOptions={{
        duration: 6000,
        style: {
          fontSize: "14px",
          fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
          borderRadius: "8px",
          border: "1px solid hsl(var(--border))",
          backgroundColor: "hsl(var(--background))",
          color: "hsl(var(--foreground))",
          boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
        },
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-white group-[.toaster]:text-slate-900 group-[.toaster]:border-slate-200 group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-slate-600",
          actionButton:
            "group-[.toast]:bg-blue-600 group-[.toast]:text-white group-[.toast]:hover:bg-blue-700 group-[.toast]:cursor-pointer",
          cancelButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:hover:bg-slate-200 group-[.toast]:cursor-pointer",
          closeButton:
            "group-[.toast]:bg-slate-100 group-[.toast]:text-slate-600 group-[.toast]:hover:bg-slate-200 group-[.toast]:cursor-pointer group-[.toast]:border-slate-200",
        },
        // ✅ IMPORTANT : Garantir l'interactivité
        unstyled: false,
        dismissible: true,
      }}
      {...props}
    />
  )
}

export { Toaster }
