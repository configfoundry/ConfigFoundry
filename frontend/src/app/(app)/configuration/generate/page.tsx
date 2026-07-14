import { PageHeader } from '@/components/common/PageHeader'
import { PlatformsView } from '@/modules/platforms/PlatformsView'

// Monitoring Platforms hub (ADR-0008) -- was the single-workflow Generate
// page; now the landing view listing every registered Platform Adapter.
// Route intentionally left at /configuration/generate (not renamed to
// /configuration/platforms) so existing bookmarks/links keep working --
// only the nav label and page content changed. Selecting Datadog navigates
// to the nested /configuration/generate/datadog route, which is where the
// original single-platform GenerateView now lives, unchanged.
export default function ConfigurationGeneratePage() {
  return (
    <>
      <PageHeader
        title="Choose Monitoring Platform"
        description="ConfigFoundry generates monitoring configuration for multiple platforms. Datadog is supported today; more are on the way."
      />
      <PlatformsView />
    </>
  )
}
