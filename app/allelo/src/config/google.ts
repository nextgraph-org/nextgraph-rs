export const GOOGLE_CLIENTS = {
    DESKTOP: {
        id: import.meta.env.VITE_GOOGLE_CLIENT_DESKTOP_ID,
        secret: import.meta.env.VITE_GOOGLE_CLIENT_DESKTOP_SECRET,
    },
    IOS: {
        id: import.meta.env.VITE_GOOGLE_CLIENT_IOS_ID,
        secret: undefined,
    },
    ANDROID: {
        id: import.meta.env.VITE_GOOGLE_CLIENT_ANDROID_ID,
        secret: undefined,
    }
}