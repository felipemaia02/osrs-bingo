import { useTranslation } from 'react-i18next'

const LANGUAGES = [
    { code: 'en', label: 'EN' },
    { code: 'pt', label: 'PT' },
    { code: 'es', label: 'ES' },
] as const

export function LanguageSwitcher() {
    const { i18n } = useTranslation()

    return (
        <div className="flex gap-2">
            {LANGUAGES.map((lang) => (
                <button
                    key={lang.code}
                    onClick={() => i18n.changeLanguage(lang.code)}
                    className={`rounded px-2 py-1 text-sm transition-colors ${i18n.language.startsWith(lang.code)
                            ? 'bg-white text-gray-900 font-semibold'
                            : 'text-gray-400 hover:text-white'
                        }`}
                >
                    {lang.label}
                </button>
            ))}
        </div>
    )
}
