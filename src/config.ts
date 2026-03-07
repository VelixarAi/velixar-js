const config = {
  API_BASE_URL: process.env.VELIXAR_API_BASE_URL || 'https://api.velixarai.com',
  BRAINIAC_API_URL: process.env.VELIXAR_BRAINIAC_URL || 'https://api.velixarai.com'
} as const;

export function validateConfig(): void {
  if (process.env.NODE_ENV === 'production') {
    if (!process.env.VELIXAR_API_BASE_URL) {
      console.warn('VELIXAR_API_BASE_URL not set, using default');
    }
    if (!process.env.VELIXAR_BRAINIAC_URL) {
      console.warn('VELIXAR_BRAINIAC_URL not set, using default');
    }
  }
}

export default Object.freeze(config);