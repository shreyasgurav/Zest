import type { Metadata } from "next"
import Contact from "./Contact"

export const metadata: Metadata = {
  title: "Contact | Zest",
  description: "Get in touch with Zest - Your ultimate guide to discovering the best experiences in Mumbai.",
  openGraph: {
    title: "Contact | Zest",
    description: "Get in touch with Zest - Your ultimate guide to discovering the best experiences in Mumbai.",
    type: "website",
  },
}

export default function ContactPage() {
  return (
    <main className="contact-page">
      <Contact />
    </main>
  )
}
