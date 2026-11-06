// Public routing policy; the server never reads a recipient from a visitor's request.
export const PROJECT_RECIPIENT = "adam.maskini@forju.at";
export const PROJECT_MAX_LENGTH = 16000;
export const projectSubject = (lang:"de"|"en") => lang==="de" ? "[ForJu Compass] Projektentwurf" : "[ForJu Compass] Project draft";
