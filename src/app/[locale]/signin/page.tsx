"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Page, Navbar, List, ListInput, Button, Block, BlockTitle } from "konsta/react";
import Link from "next/link";

export default function SignInPage() {
  const t = useTranslations('auth.signIn');
  const tCommon = useTranslations('common');
  const { data: session } = useSession();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Load saved email
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("nail_visual_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  // Redirect if already signed in
  useEffect(() => {
    if (session) {
      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
    }
  }, [session, searchParams, router]);

  const handleSubmit = async () => {
    setError("");
    setLoading(true);

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (!result?.ok) {
        setError(result?.error || t('invalidCredentials'));
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("nail_visual_email", email);
      }

      const callbackUrl = searchParams.get('callbackUrl') || '/';
      router.push(callbackUrl);
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  if (session) {
    return (
      <Page>
        <div className="min-h-screen p-4 flex items-center justify-center">
          <div className="w-full max-w-md space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('signedInAs')} {session.user?.email}
            </p>
            <p className="text-xs text-muted-foreground">
              {tCommon('role')}: {session.user?.role === "master" ? "Master" : "Client"}
            </p>
            <p className="text-xs text-muted-foreground animate-pulse">
              Redirecting...
            </p>
          </div>
        </div>
      </Page>
    );
  }

  return (
    <Page>
      <Navbar title={t('title')} />

      <BlockTitle>{t('subtitle')}</BlockTitle>
      <List strong inset>
        <ListInput
          outline
          label={t('email')}
          type="email"
          placeholder="your@email.com"
          value={email}
          onInput={(e: any) => setEmail(e.target.value)}
        />
        <ListInput
          outline
          label={t('password')}
          type="password"
          placeholder={t('password')}
          value={password}
          onInput={(e: any) => setPassword(e.target.value)}
        />
      </List>

      {error && (
        <Block className="text-red-500 text-sm text-center">
          {error}
        </Block>
      )}

      <Block>
        <Button large onClick={handleSubmit} disabled={loading}>
          {loading ? t('submitting') : t('submit')}
        </Button>
        <div className="mt-4 text-center">
          <p className="text-sm text-gray-500">
            {t('noAccount')}{" "}
            <Link href="/signup" className="text-primary font-semibold">
              {t('register')}
            </Link>
          </p>
        </div>
      </Block>
    </Page>
  );
}
