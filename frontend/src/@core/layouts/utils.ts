// ** Types
import { NavGroup, NavLink } from '@/@core/layouts/types'

/**
 * Check for URL queries as well for matching
 * Current URL & Item Path
 *
 * ADAPTED FOR APP ROUTER: the original Vuexy version took Pages Router's
 * `NextRouter` (using `router.query` / `router.asPath`). App Router has no
 * such object -- callers now pass the pathname (from `usePathname()`) and
 * searchParams (from `useSearchParams()`) directly. Same matching logic,
 * just fed from App Router's APIs instead of Pages Router's.
 *
 * @param pathname
 * @param searchParams
 * @param path
 */
export const handleURLQueries = (
  pathname: string,
  searchParams: URLSearchParams,
  path: string | undefined
): boolean => {
  const keys = Array.from(searchParams.keys())

  if (keys.length && path) {
    return pathname.includes(path) && pathname.includes(searchParams.get(keys[0]) ?? '') && path !== '/'
  }

  return false
}

/**
 * Check if the given item has the given url
 * in one of its children
 *
 * @param item
 * @param currentURL
 */
export const hasActiveChild = (item: NavGroup, currentURL: string): boolean => {
  const { children } = item

  if (!children) {
    return false
  }

  for (const child of children) {
    if ((child as NavGroup).children) {
      if (hasActiveChild(child, currentURL)) {
        return true
      }
    }
    const childPath = (child as NavLink).path

    // Check if the child has a link and is active
    if (
      child &&
      childPath &&
      currentURL &&
      (childPath === currentURL || (currentURL.includes(childPath) && childPath !== '/'))
    ) {
      return true
    }
  }

  return false
}

/**
 * Check if this is a children
 * of the given item
 *
 * @param children
 * @param openGroup
 * @param currentActiveGroup
 */
export const removeChildren = (children: NavLink[], openGroup: string[], currentActiveGroup: string[]) => {
  children.forEach((child: NavLink) => {
    if (!currentActiveGroup.includes(child.title)) {
      const index = openGroup.indexOf(child.title)
      if (index > -1) openGroup.splice(index, 1)

      // @ts-ignore
      if (child.children) removeChildren(child.children, openGroup, currentActiveGroup)
    }
  })
}
