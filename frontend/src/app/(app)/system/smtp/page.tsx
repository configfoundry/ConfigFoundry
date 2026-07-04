import { PageHeader } from '@/components/common/PageHeader'
import { SystemSettingsScaffold } from '@/modules/system/SystemSettingsScaffold'

export default function SystemSmtpPage() {
  return (
    <>
      <PageHeader title="SMTP" description="Outbound email server used for notifications, invites, and password resets." />
      <SystemSettingsScaffold
        todoEndpoint="GET/PUT /api/v1/system/smtp"
        primaryActionLabel="Save SMTP Settings"
        sections={[
          {
            title: 'Server',
            fields: [
              { name: 'host', label: 'SMTP Host', type: 'text', defaultValue: 'smtp.example.com' },
              { name: 'port', label: 'Port', type: 'number', defaultValue: '587' },
              { name: 'encryption', label: 'Encryption', type: 'select', options: [
                { value: 'starttls', label: 'STARTTLS' },
                { value: 'ssl', label: 'SSL/TLS' },
                { value: 'none', label: 'None' },
              ], defaultValue: 'starttls' },
            ],
          },
          {
            title: 'Authentication',
            fields: [
              { name: 'username', label: 'Username', type: 'text' },
              { name: 'password', label: 'Password', type: 'password' },
              { name: 'fromAddress', label: 'From address', type: 'text', defaultValue: 'noreply@configfoundry.local' },
            ],
          },
        ]}
      />
    </>
  )
}
