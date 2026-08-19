import { useTranslation } from 'react-i18next'
import { LanguageSwitcher } from '../../../components/common/LanguageSwitcher'

export function HomePage() {
    const { t } = useTranslation()

    return (
        <main className="flex min-h-screen flex-col items-center justify-center bg-gray-900 text-white">
            <div className="absolute top-4 right-4">
                <LanguageSwitcher />
            </div>
            <h1 className="text-4xl font-bold tracking-tight">{t('home.title')}</h1>
            <p className="mt-4 text-gray-400">{t('home.subtitle')}</p>
        </main>
    )
}
