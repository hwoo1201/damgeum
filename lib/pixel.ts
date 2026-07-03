export const fbEvent = (name: string, options?: any) => {
  if (typeof window !== "undefined") {
    const fbq = (window as any).fbq;
    if (fbq) {
      fbq("track", name, options);
      console.log(`[Meta Pixel Event Tracker] Triggered: ${name}`, options);
    } else {
      console.log(`[Meta Pixel Event Tracker - Debug Mode] Simulated: ${name}`, options);
    }
  }
};
