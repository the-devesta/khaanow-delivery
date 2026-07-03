export function goBackOrReplace(router: any, fallbackRoute: string) {
  if (router.canGoBack?.()) {
    router.back();
    return;
  }

  router.replace(fallbackRoute);
}
