namespace HandySales.Shared.Security;

/// <summary>
/// Blocks registration with known disposable/temporary email domains.
/// List sourced from common disposable email domain lists (3,000+ domains).
/// </summary>
public static class DisposableEmailService
{
    // Top ~200 most common disposable email domains
    // For a production system, this could be loaded from a JSON file or database
    private static readonly HashSet<string> DisposableDomains = new(StringComparer.OrdinalIgnoreCase)
    {
        "mailinator.com", "guerrillamail.com", "guerrillamail.net", "guerrillamail.org",
        "tempmail.com", "throwaway.email", "temp-mail.org", "fakeinbox.com",
        "sharklasers.com", "guerrillamailblock.com", "grr.la", "dispostable.com",
        "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf", "jetable.fr.nf",
        "nospam.ze.tc", "nomail.xl.cx", "mega.zik.dj", "speed.1s.fr", "courriel.fr.nf",
        "moncourrier.fr.nf", "monemail.fr.nf", "monmail.fr.nf",
        "tempail.com", "tempr.email", "tempmailaddress.com", "throwawaymail.com",
        "trashmail.com", "trashmail.me", "trashmail.net", "trashmail.org",
        "trashymail.com", "trashymail.net", "mailnesia.com", "maildrop.cc",
        "discard.email", "discardmail.com", "discardmail.de",
        "10minutemail.com", "10minutemail.net", "10minutemail.org",
        "20minutemail.com", "20minutemail.it",
        "mailcatch.com", "mailexpire.com", "mailforspam.com", "mailimate.com",
        "mailnull.com", "mailscrap.com", "mailshell.com", "mailsiphon.com",
        "mailslurp.com", "mailtemp.info", "mailzilla.com",
        "mintemail.com", "mohmal.com", "mt2015.com", "mx0.wwwnew.eu",
        "mytemp.email", "mytrashmail.com", "neverbox.com",
        "nobulk.com", "noclickemail.com", "nogmailspam.info", "nomail.ch",
        "nomail.xl.cx", "nospam.ze.tc", "notmailinator.com", "nowmymail.com",
        "objectmail.com", "obobbo.com", "odaymail.com", "onewaymail.com",
        "otherinbox.com", "owlpic.com", "pjjkp.com", "plexolan.de",
        "pookmail.com", "privacy.net", "proxymail.eu", "putthisinyouremail.com",
        "qq.com", "quickinbox.com", "rcpt.at", "reallymymail.com",
        "recode.me", "recursor.net", "regbypass.com", "rhyta.com",
        "rklips.com", "rmqkr.net", "royal.net", "rppkn.com",
        "rtrtr.com", "s0ny.net", "safe-mail.net", "safersignup.de",
        "safetymail.info", "safetypost.de", "sandelf.de", "saynotospams.com",
        "scatmail.com", "schafmail.de", "selfdestructingmail.com", "sendspamhere.com",
        "shieldedmail.com", "shiftmail.com", "sify.com", "skeefmail.com",
        "slaskpost.se", "slipry.net", "slopsbox.com", "smashmail.de",
        "soodonims.com", "spam4.me", "spamavert.com", "spambob.com",
        "spambob.net", "spambob.org", "spambog.com", "spambog.de",
        "spambog.ru", "spambox.us", "spamcannon.com", "spamcannon.net",
        "spamcero.com", "spamcorptastic.com", "spamcowboy.com", "spamcowboy.net",
        "spamcowboy.org", "spamday.com", "spamex.com", "spamfighter.cf",
        "spamfighter.ga", "spamfighter.gq", "spamfighter.ml", "spamfighter.tk",
        "spamfree24.com", "spamfree24.de", "spamfree24.eu", "spamfree24.info",
        "spamfree24.net", "spamfree24.org", "spamgoes.in", "spamherelots.com",
        "spamhereplease.com", "spamhole.com", "spamify.com", "spaminator.de",
        "spamkill.info", "spaml.com", "spaml.de", "spammotel.com",
        "spamobox.com", "spamoff.de", "spamslicer.com", "spamspot.com",
        "spamstack.net", "spamthis.co.uk", "spamtrap.ro", "spamtrail.com",
        "spamwc.de", "spoofmail.de", "stuffmail.de", "superrito.com",
        "suremail.info", "teewars.org", "teleworm.com", "teleworm.us",
        "temp.emeraldcraft.com", "temp.headstrong.de", "tempail.com",
        "tempalias.com", "tempe4mail.com", "tempemail.biz", "tempemail.co.za",
        "tempemail.com", "tempemail.net", "tempinbox.com", "tempinbox.co.uk",
        "tempmail.eu", "tempmail.it", "tempmail2.com", "tempmaildemo.com",
        "tempmailer.com", "tempmailer.de", "tempomail.fr", "temporarioemail.com.br",
        "temporaryemail.net", "temporaryemail.us", "temporaryforwarding.com",
        "temporaryinbox.com", "temporarymailaddress.com", "thankyou2010.com",
        "thisisnotmyrealemail.com", "throwam.com", "tittbit.in",
        "tmail.ws", "tmailinator.com", "toiea.com", "tradermail.info",
        "trash-amil.com", "trash-mail.at", "trash-mail.cf", "trash-mail.com",
        "trash-mail.de", "trash-mail.ga", "trash-mail.gq", "trash-mail.ml",
        "trash-mail.tk", "trash2009.com", "trash2010.com", "trash2011.com",
        "trashdevil.com", "trashdevil.de", "trashemail.de", "trashimail.de",
        "trbvm.com", "trbvn.com", "turual.com", "twinmail.de",
        "tyldd.com", "uggsrock.com", "umail.net", "upliftnow.com",
        "uplipht.com", "venompen.com", "veryreallyfakemail.com", "viditag.com",
        "viewcastmedia.com", "viewcastmedia.net", "viewcastmedia.org",
        "vomoto.com", "vpn.st", "vsimcard.com", "vubby.com",
        "wasteland.rfc822.org", "webemail.me", "weg-werf-email.de",
        "wegwerfadresse.de", "wegwerfemail.com", "wegwerfemail.de", "wegwerfmail.de",
        "wegwerfmail.net", "wegwerfmail.org", "wh4f.org", "whatiaas.com",
        "whatpaas.com", "whyspam.me", "wickmail.net", "wilemail.com",
        "willhackforfood.biz", "willselfdestruct.com", "winemaven.info",
        "wronghead.com", "wuzup.net", "wuzupmail.net", "wwwnew.eu",
        "xagloo.com", "xemaps.com", "xents.com", "xjoi.com",
        "xmaily.com", "xoxy.net", "xyzfree.net", "yapped.net",
        "yeah.net", "yep.it", "yogamaven.com", "yomail.info",
        "yuurok.com", "zehnminuten.de", "zehnminutenmail.de", "zetmail.com",
        "zippymail.info", "zoaxe.com", "zoemail.org",
        "guerrillamail.de", "guerrillamail.biz", "mailforspam.com",
        "getairmail.com", "getnada.com", "emailondeck.com", "33mail.com",
        "maildrop.cc", "inboxkitten.com", "harakirimail.com", "mailsac.com",
        "burnermail.io", "spamgourmet.com", "mytempemail.com",
    };

    /// <summary>
    /// Returns true if the email domain is a known disposable/temporary email provider.
    /// </summary>
    public static bool IsDisposable(string email)
    {
        if (string.IsNullOrWhiteSpace(email))
            return false;

        var parts = email.Split('@');
        if (parts.Length != 2)
            return false;

        var domain = parts[1].Trim().ToLowerInvariant();
        return DisposableDomains.Contains(domain);
    }
}
