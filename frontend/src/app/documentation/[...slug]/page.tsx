import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { getDoc, listDocSlugs } from '@/lib/docs'
import { DocsContent } from '@/components/docs/DocsContent'

// Static export: every doc page is pre-rendered at build time from
// docs/**/*.md. There is no server at runtime to render an unknown slug on
// demand, so dynamicParams is false -- an unrecognized path is simply
// not part of the built site, same as any other static host.
//
// Catch-all ([...slug], not [slug]): docs/ is organized into topic
// subdirectories (docs/architecture/, docs/api/, ...), so a doc's slug is
// a multi-segment path like "architecture/architecture" -- a single
// [slug] segment can't represent that. params.slug is therefore always a
// string[] of path segments, joined back into the flat "a/b/c" slug string
// that frontend/src/lib/docs.ts's functions expect.
export const dynamicParams = false

export function generateStaticParams() {
  return listDocSlugs().map((slug) => ({ slug: slug.split('/') }))
}

function slugParam(params: { slug: string[] }): string {
  return params.slug.join('/')
}

export function generateMetadata({ params }: { params: { slug: string[] } }): Metadata {
  try {
    const doc = getDoc(slugParam(params))
    return { title: `${doc.title} · ConfigFoundry Docs` }
  } catch {
    return { title: 'ConfigFoundry Docs' }
  }
}

export default function DocSlugPage({ params }: { params: { slug: string[] } }) {
  let doc
  try {
    doc = getDoc(slugParam(params))
  } catch {
    notFound()
  }
  return (
    <DocsContent
      slug={doc.slug}
      title={doc.title}
      group={doc.group}
      html={doc.html}
      headings={doc.headings}
      lastUpdated={doc.lastUpdated}
      prev={doc.prev}
      next={doc.next}
    />
  )
}
