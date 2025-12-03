"use client";

import { signIn, useSession } from "next-auth/react";
import { useState, useEffect } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/routing';
import { useSearchParams } from 'next/navigation';
import { Page, Navbar, NavbarBackLink, List, ListInput, Button, Block, BlockTitle } from "konsta/react";
import Link from "next/link";

export default function SignInPage() {
  const t = useTranslations('auth.signIn');
  const tCommon = useTranslations('common');
  const { data: session, status } = useSession();
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
    if (status === "authenticated" && session) {
      const callbackUrl = searchParams.get('callbackUrl');
      // If there's a callback URL, use it (e.g., from protected route redirect)
      if (callbackUrl) {
        router.replace(callbackUrl);
      } else {
        // Otherwise, redirect to profile for masters, or home for clients
        const redirectUrl = session.user?.role === "master" ? "/profile" : "/";
        router.replace(redirectUrl);
      }
    }
  }, [session, status, searchParams, router]);

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
        setLoading(false);
        return;
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("nail_visual_email", email);
      }

      // Refresh router to update session, then redirect immediately
      router.refresh();
      
      // Immediate redirect - session will be available on next page
      const callbackUrl = searchParams.get('callbackUrl');
      if (callbackUrl) {
        router.replace(callbackUrl);
      } else {
        // Redirect to profile - the profile page will handle role checks
        router.replace("/profile");
      }
    } catch {
      setError(t('error'));
      setLoading(false);
    }
  };

  // Don't show redirect screen if session is loading or if we're already redirecting
  if (status === "loading") {
    return null; // Or a loading spinner
  }

  if (status === "authenticated" && session) {
    // Redirect is happening, show minimal loading state
    return null;
  }

  const handleBack = () => {
    // If there's a referrer and it's not the same page, go back
    if (typeof window !== 'undefined' && document.referrer && !document.referrer.includes('/signin')) {
      router.back();
    } else {
      // Otherwise go to home
      router.push('/');
    }
  };

  return (
    <Page>
      <Navbar
        left={<NavbarBackLink onClick={handleBack} text="Back" />}
        className="relative z-10 bg-white dark:bg-gray-900"
      />
      <BlockTitle
      >
        {t('subtitle')}
      </BlockTitle>
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
