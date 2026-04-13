import React from 'react';
import { Locale, useLocaleStore, useT } from '../../i18n';

export const LocaleSwitcher: React.FC = () => {
  const t = useT();
  const { locale, setLocale } = useLocaleStore();

  const toggle = () => {
    setLocale(locale === 'en' ? 'zh-CN' : 'en');
  };

  return (
    <button
      className="locale-switcher"
      onClick={toggle}
      title={locale === 'en' ? t('locale.zh') : t('locale.en')}
    >
      {locale === 'en' ? t('locale.zh') : t('locale.en')}
    </button>
  );
};
