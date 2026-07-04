import { PageHeader } from '@/components/common/PageHeader'
import { SystemSettingsScaffold } from '@/modules/system/SystemSettingsScaffold'

export default function SystemDatabasePage() {
  return (
    <>
      <PageHeader title="Database" description="Connection and maintenance settings for ConfigFoundry's primary database." />
      <SystemSettingsScaffold
        todoEndpoint="GET/PUT /api/v1/system/database"
        primaryActionLabel="Save Database Settings"
        sections={[
          {
            title: 'Connection',
            description: 'Where ConfigFoundry stores its data.',
            fields: [
              { name: 'engine', label: 'Engine', type: 'select', options: [
                { value: 'postgresql', label: 'PostgreSQL' },
                { value: 'sqlite', label: 'SQLite' },
                { value: 'mysql', label: 'MySQL' },
              ], defaultValue: 'postgresql' },
              { name: 'host', label: 'Host', type: 'text', defaultValue: 'localhost' },
              { name: 'port', label: 'Port', type: 'number', defaultValue: '5432' },
              { name: 'database', label: 'Database name', type: 'text', defaultValue: 'configfoundry' },
              { name: 'sslMode', label: 'SSL Mode', type: 'select', options: [
                { value: 'disable', label: 'Disable' },
                { value: 'require', label: 'Require' },
                { value: 'verify-full', label: 'Verify Full' },
              ], defaultValue: 'require' },
              { name: 'poolSize', label: 'Pool size', type: 'number', defaultValue: '10' },
            ],
          },
          {
            title: 'Maintenance',
            fields: [
              { name: 'autoVacuum', label: 'Enable automatic vacuum', type: 'switch', defaultValue: true },
              { name: 'backupBeforeMigration', label: 'Back up before running migrations', type: 'switch', defaultValue: true },
            ],
          },
        ]}
      />
    </>
  )
}
