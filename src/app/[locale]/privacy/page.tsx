import { useTranslations } from 'next-intl';

export default function PrivacyPolicyPage() {
  const t = useTranslations('privacy');
  
  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-6 pt-16 md:pt-4">
      <div>
        <h1 className="text-3xl font-bold mb-4">{t('title')}</h1>
        <p className="text-sm text-muted-foreground">{t('lastUpdated')}: {new Date().toLocaleDateString()}</p>
      </div>

      <div className="space-y-6 prose prose-sm max-w-none">
        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section1Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section1Text1')}
          </p>
          <p className="text-muted-foreground mb-4">
            {t('section1Text2')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section2Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section2Text')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section2Item1')}</li>
            <li>{t('section2Item2')}</li>
            <li>{t('section2Item3')}</li>
            <li>{t('section2Item4')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section3Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section3Text')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section3Item1')}</li>
            <li>{t('section3Item2')}</li>
            <li>{t('section3Item3')}</li>
            <li>{t('section3Item4')}</li>
            <li>{t('section3Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section4Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section4Text')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section5Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section5Text')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section6Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section6Text')}
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>{t('section6Item1')}</li>
            <li>{t('section6Item2')}</li>
            <li>{t('section6Item3')}</li>
            <li>{t('section6Item4')}</li>
            <li>{t('section6Item5')}</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section7Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section7Text')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section8Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section8Text')}
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">{t('section9Title')}</h2>
          <p className="text-muted-foreground mb-4">
            {t('section9Text')}
          </p>
        </section>
      </div>
    </div>
  );
}

