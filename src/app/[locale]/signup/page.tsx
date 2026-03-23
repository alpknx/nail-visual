"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { useTranslations } from 'next-intl';
import { useRouter } from 'next/navigation';
import { Page, Navbar, NavbarBackLink, List, ListInput, Button, Block, BlockTitle } from "konsta/react";
import Link from "next/link";

export default function SignUpPage() {
  const t = useTranslations('auth.signUp');
  const router = useRouter();
  const [role, setRole] = useState<"master" | "client">("client");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");

    if (password !== confirmPassword) {
      setError(t('passwordsNotMatch'));
      return;
    }

    if (password.length < 8) {
      setError(t('passwordMinLength'));
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || t('registrationError'));
        return;
      }

      // Sign in after registration
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.ok) {
        router.push(role === "master" ? "/onboarding" : "/");
      } else {
        setError(t('signInAfterRegistrationError'));
      }
    } catch {
      setError(t('error'));
    } finally {
      setLoading(false);
    }
  };

  const handleBack = () => {
    // If there's a referrer and it's not the same page, go back
    if (typeof window !== 'undefined' && document.referrer && !document.referrer.includes('/signup')) {
      router.back();
    } else {
      // Otherwise go to signin or home
      router.push('/signin');
    }
  };

  return (
    <Page>
      <Navbar
        left={<NavbarBackLink onClick={handleBack} text="Back" />}
        className="relative z-10 bg-white dark:bg-gray-900"
      />
      <BlockTitle>
        {t('subtitle')}
      </BlockTitle>

      {/* Role selector */}
      <Block>
        <p className="text-sm text-gray-500 mb-2">{t('iWant')}</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setRole("client")}
            className={[
              "flex-1 py-3 rounded-2xl text-sm font-medium border transition-colors",
              role === "client"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-600 border-gray-200",
            ].join(" ")}
          >
            {t('findMaster')}
          </button>
          <button
            type="button"
            onClick={() => setRole("master")}
            className={[
              "flex-1 py-3 rounded-2xl text-sm font-medium border transition-colors",
              role === "master"
                ? "bg-black text-white border-black"
                : "bg-white text-gray-600 border-gray-200",
            ].join(" ")}
          >
            {t('offerServices')}
          </button>
        </div>
      </Block>

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
          placeholder="Min 8 characters"
          value={password}
          onInput={(e: any) => setPassword(e.target.value)}
        />
        <ListInput
          outline
          label={t('confirmPassword')}
          type="password"
          placeholder={t('confirmPassword')}
          value={confirmPassword}
          onInput={(e: any) => setConfirmPassword(e.target.value)}
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
            {t('hasAccount')}{" "}
            <Link href="/signin" className="text-primary font-semibold">
              {t('signIn')}
            </Link>
          </p>
        </div>
      </Block>
    </Page>
  );
}
