import { PageHeader } from '@/components/common/PageHeader'
import { SystemSettingsScaffold } from '@/modules/system/SystemSettingsScaffold'

export default function SystemStoragePage() {
  return (
    <>
      <PageHeader title="Storage" description="Where generated configuration files and exports are written." />
      <SystemSettingsScaffold
        todoEndpoint="GET/PUT /api/v1/system/storage"
        primaryActionLabel="Save Storage Settings"
        sections={[
          {
            title: 'Storage Backend',
            fields: [
              { name: 'backend', label: 'Backend', type: 'select', options: [
                { value: 'local', label: 'Local filesystem' },
                { value: 's3', label: 'Amazon S3' },
                { value: 'gcs', label: 'Google Cloud Storage' },
                { value: 'azure', label: 'Azure Blob Storage' },
              ], defaultValue: 'local' },
              { name: 'path', label: 'Path / Bucket', type: 'text', defaultValue: '/var/lib/configfoundry/output' },
              { name: 'region', label: 'Region', type: 'text' },
            ],
          },
          {
            title: 'Retention',
            fields: [
              { name: 'retentionDays', label: 'Retain generated files for (days)', type: 'number', defaultValue: '90' },
              { name: 'compressOldExports', label: 'Compress exports older than retention window', type: 'switch', defaultValue: true },
            ],
          },
        ]}
      />
    </>
  )
}
