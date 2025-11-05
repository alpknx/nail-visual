export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen p-4 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold mb-4">Политика конфиденциальности</h1>
        <p className="text-sm text-muted-foreground">Последнее обновление: {new Date().toLocaleDateString("ru-RU")}</p>
      </div>

      <div className="space-y-6 prose prose-sm max-w-none">
        <section>
          <h2 className="text-2xl font-semibold mb-3">1. Общие положения</h2>
          <p className="text-muted-foreground mb-4">
            Настоящая Политика конфиденциальности определяет порядок обработки и защиты персональных данных 
            пользователей сервиса Nail Visual (далее — «Сервис»).
          </p>
          <p className="text-muted-foreground mb-4">
            Используя Сервис, вы соглашаетесь с условиями настоящей Политики конфиденциальности.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">2. Собираемая информация</h2>
          <p className="text-muted-foreground mb-4">
            Мы собираем следующие типы информации:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Персональные данные: имя, email, телефон, город</li>
            <li>Данные профиля: фотографии, описания, теги</li>
            <li>Технические данные: IP-адрес, тип браузера, данные об устройстве</li>
            <li>Данные использования: информация о взаимодействии с Сервисом</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">3. Использование информации</h2>
          <p className="text-muted-foreground mb-4">
            Собранная информация используется для:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Предоставления и улучшения Сервиса</li>
            <li>Обработки запросов и связи с пользователями</li>
            <li>Персонализации контента</li>
            <li>Анализа использования Сервиса</li>
            <li>Обеспечения безопасности</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">4. Защита данных</h2>
          <p className="text-muted-foreground mb-4">
            Мы применяем технические и организационные меры для защиты ваших персональных данных 
            от несанкционированного доступа, изменения, раскрытия или уничтожения.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">5. Передача данных третьим лицам</h2>
          <p className="text-muted-foreground mb-4">
            Мы не продаем, не обмениваем и не передаем ваши персональные данные третьим лицам 
            без вашего согласия, за исключением случаев, предусмотренных законодательством.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">6. Права пользователей</h2>
          <p className="text-muted-foreground mb-4">
            Вы имеете право:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-muted-foreground">
            <li>Получить доступ к своим персональным данным</li>
            <li>Исправить неточные данные</li>
            <li>Удалить свои данные</li>
            <li>Ограничить обработку данных</li>
            <li>Возразить против обработки данных</li>
          </ul>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">7. Cookies</h2>
          <p className="text-muted-foreground mb-4">
            Сервис использует cookies для улучшения пользовательского опыта. 
            Вы можете настроить свой браузер для отказа от cookies, однако это может 
            ограничить функциональность Сервиса.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">8. Изменения в Политике конфиденциальности</h2>
          <p className="text-muted-foreground mb-4">
            Мы оставляем за собой право вносить изменения в настоящую Политику конфиденциальности. 
            О существенных изменениях мы уведомим пользователей через Сервис или по email.
          </p>
        </section>

        <section>
          <h2 className="text-2xl font-semibold mb-3">9. Контакты</h2>
          <p className="text-muted-foreground mb-4">
            По вопросам, связанным с обработкой персональных данных, вы можете связаться с нами 
            через форму обратной связи в Сервисе.
          </p>
        </section>
      </div>
    </div>
  );
}

