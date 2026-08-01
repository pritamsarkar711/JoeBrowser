/** Type declaration for Vite `?raw` imports in the main process build. */
declare module '*.html?raw' {
  const content: string
  export default content
}
