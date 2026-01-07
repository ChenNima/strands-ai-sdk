import "./globals.css";
import { GeistSans } from "geist/font/sans";
import { Toaster } from "sonner";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { cn } from "@/lib/utils";
import { Navbar } from "@/components/navbar";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthProvider } from "@/contexts/auth-context";
import { ErrorBoundary } from "@/components/error-boundary";

export async function generateMetadata() {
  const t = await getTranslations("metadata");
  return {
    title: t("title"),
    description: t("description"),
    openGraph: {
      images: [
        {
          url: "/og?title=AI SDK Python Streaming Preview",
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      images: [
        {
          url: "/og?title=AI SDK Python Streaming Preview",
        },
      ],
    },
  };
}

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const locale = await getLocale();
  const messages = await getMessages();

  return (
    <html lang={locale} suppressHydrationWarning>
      <head></head>
      <body className={cn(GeistSans.className, "antialiased", "flex flex-col h-screen overflow-hidden")}>
        <NextIntlClientProvider messages={messages}>
          <ThemeProvider
            attribute="class"
            defaultTheme="system"
            enableSystem
            disableTransitionOnChange
          >
            <ErrorBoundary>
              <AuthProvider>
                <Toaster position="top-center" richColors />
                <Navbar />
                <main className="flex-1 overflow-hidden">
                  {children}
                </main>
              </AuthProvider>
            </ErrorBoundary>
          </ThemeProvider>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
