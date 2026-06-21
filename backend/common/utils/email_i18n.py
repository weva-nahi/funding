"""Email internationalization strings and unsubscribe-token helpers.

Each transactional email type has a small dict of strings per language.
Templates receive the resolved dict for the recipient's preferred_language
as `t` in their context (e.g. `{{ t.title }}`), so the HTML structure stays
in one file per email type while only the text varies per language.
"""

from django.conf import settings
from django.core.signing import BadSignature, SignatureExpired, TimestampSigner

_unsub_signer = TimestampSigner(salt="email-unsubscribe")

SUPPORTED_LANGUAGES = {"fr", "en", "ar"}


def resolve_language(user) -> str:
    """Return the recipient's preferred language, defaulting to 'fr'."""
    lang = getattr(getattr(user, "profile", None), "preferred_language", None)
    if lang in SUPPORTED_LANGUAGES:
        return lang
    return "fr"


def generate_unsubscribe_token(user_id: int) -> str:
    """One-way signed token identifying which user to unsubscribe.

    Unlike auth tokens, this never expires by design — an unsubscribe link
    sent in an email from months ago must still work, since GDPR requires
    the opt-out mechanism to remain functional for as long as the email
    that contained it might plausibly still be read.
    """
    return _unsub_signer.sign(str(user_id))


def resolve_unsubscribe_token(token: str) -> int:
    """Return the user id encoded in an unsubscribe token, or None if invalid.

    max_age=None (the default) means this never expires — see the note on
    generate_unsubscribe_token above.
    """
    try:
        raw = _unsub_signer.unsign(token)
        return int(raw)
    except (BadSignature, SignatureExpired, ValueError, TypeError):
        return None


def unsubscribe_url(user_id: int) -> str:
    token = generate_unsubscribe_token(user_id)
    return f"{settings.FRONTEND_URL}/unsubscribe/{token}"


# ─── Per-email-type translation tables ──────────────────────────────────────

VERIFY_EMAIL = {
    "fr": {
        "preheader": "Bienvenue sur Richat Funding Tracker !",
        "heading": "Bienvenue sur Richat Funding Tracker !",
        "greeting": "Bonjour {email},",
        "body": "Merci pour votre inscription. Veuillez vérifier votre adresse e-mail pour activer votre compte.",
        "button": "Vérifier mon e-mail",
        "copy_link": "Ou copiez ce lien :",
        "expiry": "Ce lien expire dans 24 heures.",
        "unsubscribe": "Se désabonner des e-mails",
    },
    "en": {
        "preheader": "Welcome to Richat Funding Tracker!",
        "heading": "Welcome to Richat Funding Tracker!",
        "greeting": "Hello {email},",
        "body": "Thank you for registering. Please verify your email address to activate your account.",
        "button": "Verify my email",
        "copy_link": "Or copy this link:",
        "expiry": "This link expires in 24 hours.",
        "unsubscribe": "Unsubscribe from emails",
    },
    "ar": {
        "preheader": "مرحباً بك في Richat Funding Tracker!",
        "heading": "مرحباً بك في Richat Funding Tracker!",
        "greeting": "مرحباً {email}،",
        "body": "شكراً لتسجيلك. يرجى التحقق من عنوان بريدك الإلكتروني لتفعيل حسابك.",
        "button": "تحقق من بريدي الإلكتروني",
        "copy_link": "أو انسخ هذا الرابط:",
        "expiry": "تنتهي صلاحية هذا الرابط خلال 24 ساعة.",
        "unsubscribe": "إلغاء الاشتراك من الرسائل",
    },
}

RESET_PASSWORD = {
    "fr": {
        "preheader": "Réinitialisation de votre mot de passe",
        "heading": "Réinitialisation de votre mot de passe",
        "greeting": "Bonjour {email},",
        "body": "Nous avons reçu une demande de réinitialisation de votre mot de passe. Cliquez ci-dessous pour définir un nouveau mot de passe.",
        "button": "Réinitialiser mon mot de passe",
        "copy_link": "Ou copiez ce lien :",
        "expiry_and_ignore": "Ce lien expire dans 1 heure. Si vous n'avez pas effectué cette demande, vous pouvez ignorer cet e-mail.",
        "unsubscribe": "Se désabonner des e-mails",
    },
    "en": {
        "preheader": "Reset your password",
        "heading": "Reset your password",
        "greeting": "Hello {email},",
        "body": "We received a request to reset your password. Click below to set a new password.",
        "button": "Reset my password",
        "copy_link": "Or copy this link:",
        "expiry_and_ignore": "This link expires in 1 hour. If you didn't make this request, you can safely ignore this email.",
        "unsubscribe": "Unsubscribe from emails",
    },
    "ar": {
        "preheader": "إعادة تعيين كلمة المرور",
        "heading": "إعادة تعيين كلمة المرور",
        "greeting": "مرحباً {email}،",
        "body": "تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك. اضغط أدناه لتعيين كلمة مرور جديدة.",
        "button": "إعادة تعيين كلمة المرور",
        "copy_link": "أو انسخ هذا الرابط:",
        "expiry_and_ignore": "تنتهي صلاحية هذا الرابط خلال ساعة واحدة. إذا لم تقم بهذا الطلب، يمكنك تجاهل هذه الرسالة بأمان.",
        "unsubscribe": "إلغاء الاشتراك من الرسائل",
    },
}

APPLICATION_APPROVED = {
    "fr": {
        "preheader": "Votre candidature a été approuvée",
        "heading": "Candidature approuvée ! 🎉",
        "greeting": "Bonjour {email},",
        "body": "Votre candidature pour <strong>{opportunity_title}</strong> a été approuvée.",
        "comment_label": "Commentaire de l'administrateur :",
        "button": "Voir ma candidature",
        "unsubscribe": "Se désabonner des e-mails",
    },
    "en": {
        "preheader": "Your application has been approved",
        "heading": "Application approved! 🎉",
        "greeting": "Hello {email},",
        "body": "Your application for <strong>{opportunity_title}</strong> has been approved.",
        "comment_label": "Administrator comment:",
        "button": "View my application",
        "unsubscribe": "Unsubscribe from emails",
    },
    "ar": {
        "preheader": "تمت الموافقة على طلبك",
        "heading": "تمت الموافقة على الطلب! 🎉",
        "greeting": "مرحباً {email}،",
        "body": "تمت الموافقة على طلبك لـ <strong>{opportunity_title}</strong>.",
        "comment_label": "تعليق المسؤول:",
        "button": "عرض طلبي",
        "unsubscribe": "إلغاء الاشتراك من الرسائل",
    },
}

APPLICATION_REJECTED = {
    "fr": {
        "preheader": "Mise à jour de votre candidature",
        "heading": "Mise à jour de votre candidature",
        "greeting": "Bonjour {email},",
        "body": "Votre candidature pour <strong>{opportunity_title}</strong> n'a pas été retenue cette fois-ci.",
        "reason_label": "Motif :",
        "encouragement": "Ne vous découragez pas — de nouvelles opportunités de financement sont ajoutées régulièrement.",
        "button": "Parcourir les opportunités",
        "unsubscribe": "Se désabonner des e-mails",
    },
    "en": {
        "preheader": "Update on your application",
        "heading": "Application update",
        "greeting": "Hello {email},",
        "body": "Your application for <strong>{opportunity_title}</strong> was not selected this time.",
        "reason_label": "Reason:",
        "encouragement": "Don't be discouraged — new funding opportunities are added regularly.",
        "button": "Browse opportunities",
        "unsubscribe": "Unsubscribe from emails",
    },
    "ar": {
        "preheader": "تحديث بخصوص طلبك",
        "heading": "تحديث الطلب",
        "greeting": "مرحباً {email}،",
        "body": "لم يتم قبول طلبك لـ <strong>{opportunity_title}</strong> هذه المرة.",
        "reason_label": "السبب:",
        "encouragement": "لا تيأس — تُضاف فرص تمويل جديدة بانتظام.",
        "button": "تصفح الفرص",
        "unsubscribe": "إلغاء الاشتراك من الرسائل",
    },
}

CONSULTING_RESPONSE = {
    "fr": {
        "preheader": "Réponse à votre demande de conseil",
        "heading": "Réponse à votre demande de conseil",
        "greeting": "Bonjour {email},",
        "body": "L'équipe Richat a répondu à votre demande de conseil n°{request_id}.",
        "button": "Voir les détails",
        "unsubscribe": "Se désabonner des e-mails",
    },
    "en": {
        "preheader": "Response to your consulting request",
        "heading": "Response to your consulting request",
        "greeting": "Hello {email},",
        "body": "The Richat team has responded to your consulting request #{request_id}.",
        "button": "View details",
        "unsubscribe": "Unsubscribe from emails",
    },
    "ar": {
        "preheader": "رد على طلب الاستشارة",
        "heading": "رد على طلب الاستشارة",
        "greeting": "مرحباً {email}،",
        "body": "رد فريق ريشات على طلب الاستشارة رقم {request_id}.",
        "button": "عرض التفاصيل",
        "unsubscribe": "إلغاء الاشتراك من الرسائل",
    },
}

BASE_FOOTER = {
    "fr": {
        "tagline": "Financement climatique pour les entreprises mauritaniennes",
        "copyright": "© Richat Partners — Nouakchott, Mauritanie",
        "footer_note": "Vous recevez cet e-mail car vous avez un compte sur Richat Funding Tracker.",
    },
    "en": {
        "tagline": "Climate financing for Mauritanian businesses",
        "copyright": "© Richat Partners — Nouakchott, Mauritania",
        "footer_note": "You are receiving this email because you have an account on Richat Funding Tracker.",
    },
    "ar": {
        "tagline": "التمويل المناخي للشركات الموريتانية",
        "copyright": "© Richat Partners — نواكشوط، موريتانيا",
        "footer_note": "أنت تتلقى هذه الرسالة لأن لديك حساباً على Richat Funding Tracker.",
    },
}