// ** Returns initials from string
// Verbatim port of Vuexy's @core/utils/get-initials.ts (used by
// NotificationDropdown's RenderAvatar for the avatarText fallback case).
export const getInitials = (string: string) =>
  string.split(/\s/).reduce((response, word) => (response += word.slice(0, 1)), '')
