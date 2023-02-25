use std::fmt;

/**
 * Evaluates escape sequences in the raw string.
 */
pub(crate) fn cook(raw: &str) -> Result<Option<String>, EscapeError> {
    let mut buf = String::with_capacity(raw.len());
    let mut last_surrogate: Option<u16> = None;
    let mut has_invalid_surrogate = false;
    let mut last = 0;
    while last < raw.len() {
        let Some(escape_pos) = raw[last..].find('\\').map(|x| last + x) else {
            break;
        };
        buf.push_str(&raw[last..escape_pos]);
        let esc = &raw[escape_pos + 1..];
        let esc0 = esc.as_bytes().get(0).copied().unwrap_or(b'\0');
        match esc0 {
            b'0' => {
                let esc1 = esc.as_bytes().get(1).copied().unwrap_or(b'\0');
                if esc1.is_ascii_digit() {
                    return Err(EscapeError::LegacyOctalEscape);
                }
                buf.push_str("\0");
                last = escape_pos + 2;
            }
            b'1'..=b'7' => {
                return Err(EscapeError::LegacyOctalEscape);
            }
            b'8'..=b'9' => {
                return Err(EscapeError::NonOctalEscape);
            }
            b'x' => {
                if esc
                    .as_bytes()
                    .get(1..3)
                    .map(|s| s.iter().all(|&ch| ch.is_ascii_hexdigit()))
                    .unwrap_or(false)
                {
                    let ord = u8::from_str_radix(&esc[1..3], 16).unwrap();
                    buf.push(ord as char);
                    last = escape_pos + 4;
                } else {
                    return Err(EscapeError::InvalidHexEscape);
                }
            }
            b'u' => {
                let (ord, esc_len) = if esc
                    .as_bytes()
                    .get(1..5)
                    .map(|s| s.iter().all(|&ch| ch.is_ascii_hexdigit()))
                    .unwrap_or(false)
                {
                    let ord = u32::from_str_radix(&esc[1..5], 16).unwrap();
                    (ord, 6)
                } else if esc.as_bytes().get(1) == Some(&b'{') {
                    let mut i = 2;
                    while i < esc.len() && esc.as_bytes()[i].is_ascii_hexdigit() {
                        i += 1;
                    }
                    if i < esc.len() && esc.as_bytes()[i] == b'}' {
                        i += 1;
                    } else {
                        return Err(EscapeError::InvalidUnicodeEscape);
                    }
                    let ord = u32::from_str_radix(&esc[2..i - 1], 16)
                        .map_err(|_| EscapeError::UndefinedCodePoint)?;
                    if ord >= 0x110000 {
                        return Err(EscapeError::UndefinedCodePoint);
                    }
                    (ord, i + 1)
                } else {
                    return Err(EscapeError::InvalidUnicodeEscape);
                };
                if (0xD800..0xE000).contains(&ord) {
                    if (0xD800..0xDC00).contains(&ord) {
                        // Lower surrogate
                        if let Some(ls) = last_surrogate {
                            let pair_ord =
                                (u32::from(ls) - 0xDC00) * 0x400 + (ord - 0xD800) + 0x10000;
                            buf.push(char::from_u32(pair_ord).unwrap());
                            last_surrogate = None;
                        }
                    } else if (0xDC00..0xE000).contains(&ord) && last_surrogate.is_some() {
                        // Upper surrogate
                        last_surrogate = Some(ord as u16);
                    } else {
                        has_invalid_surrogate = true;
                    }
                    last = escape_pos + esc_len;
                    continue;
                }
                buf.push(char::from_u32(ord).unwrap());
                last = escape_pos + esc_len;
            }
            b'b' => {
                buf.push_str("\x08");
                last = escape_pos + 2;
            }
            b'f' => {
                buf.push_str("\x0C");
                last = escape_pos + 2;
            }
            b'n' => {
                buf.push_str("\n");
                last = escape_pos + 2;
            }
            b'r' => {
                buf.push_str("\r");
                last = escape_pos + 2;
            }
            b't' => {
                buf.push_str("\t");
                last = escape_pos + 2;
            }
            b'v' => {
                buf.push_str("\x0B");
                last = escape_pos + 2;
            }
            b'\\' => {
                buf.push_str("\\");
                last = escape_pos + 2;
            }
            _ => {
                let newline_len = ["\n", "\r", "\u{2028}", "\u{2029}"]
                    .iter()
                    .find_map(|&needle| esc.starts_with(needle).then(|| needle.len()));
                if let Some(newline_len) = newline_len {
                    last = escape_pos + 1 + newline_len;
                } else {
                    last = escape_pos + 1;
                }
                continue;
            }
        }
        if last_surrogate.is_some() {
            last_surrogate = None;
            has_invalid_surrogate = true;
        }
    }
    buf.push_str(&raw[last..]);
    Ok((!has_invalid_surrogate).then(|| buf))
}

#[derive(Debug)]
pub(crate) enum EscapeError {
    LegacyOctalEscape,
    NonOctalEscape,
    InvalidHexEscape,
    UndefinedCodePoint,
    InvalidUnicodeEscape,
}

impl fmt::Display for EscapeError {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            EscapeError::LegacyOctalEscape => write!(
                f,
                "Octal escape sequences are not allowed in template strings."
            ),
            EscapeError::NonOctalEscape => {
                write!(f, "\\8 and \\9 are not allowed in template strings.")
            }
            EscapeError::InvalidHexEscape => write!(f, "Invalid hexadecimal escape sequence"),
            EscapeError::UndefinedCodePoint => write!(f, "Undefined Unicode code-point"),
            EscapeError::InvalidUnicodeEscape => write!(f, "Invalid Unicode escape sequence"),
        }
    }
}

impl std::error::Error for EscapeError {}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_keep_plain_text() {
        assert_eq!(cook("foo").unwrap().unwrap(), "foo");
    }

    #[test]
    fn test_expand_simple_escapes() {
        assert_eq!(
            cook("\\` \\$ \\{ \\' \\\" \\\\ \\b \\f \\n \\r \\t \\v \\0")
                .unwrap()
                .unwrap(),
            "` $ { ' \" \\ \x08 \x0C \n \r \t \x0B \0"
        );
    }

    #[test]
    fn test_expand_identity_escapes() {
        assert_eq!(cook("\\a \\% \\( \\)").unwrap().unwrap(), "a % ( )");
    }

    #[test]
    fn test_teject_non_octal_8() {
        assert_eq!(
            cook("\\8").unwrap_err().to_string(),
            "\\8 and \\9 are not allowed in template strings."
        );
    }

    #[test]
    fn test_reject_non_octal_9() {
        assert_eq!(
            cook("\\9").unwrap_err().to_string(),
            "\\8 and \\9 are not allowed in template strings."
        );
    }

    #[test]
    fn test_reject_octal_single_digit() {
        assert_eq!(
            cook("\\7").unwrap_err().to_string(),
            "Octal escape sequences are not allowed in template strings."
        );
    }

    #[test]
    fn test_reject_octal_leading_zero() {
        assert_eq!(
            cook("\\01").unwrap_err().to_string(),
            "Octal escape sequences are not allowed in template strings."
        );
    }

    #[test]
    fn test_expand_hex_escapes() {
        assert_eq!(
            cook("\\x00 \\x61 \\xA0").unwrap().unwrap(),
            "\x00 \x61 \u{A0}"
        );
    }

    #[test]
    fn test_reject_incomplete_hex_single_digit_non_eof() {
        assert_eq!(
            cook("\\x8%").unwrap_err().to_string(),
            "Invalid hexadecimal escape sequence"
        );
    }

    #[test]
    fn test_reject_incomplete_hex_single_digit_eof() {
        assert_eq!(
            cook("\\x8").unwrap_err().to_string(),
            "Invalid hexadecimal escape sequence"
        );
    }

    #[test]
    fn test_reject_incomplete_hex_no_digit_non_eof() {
        assert_eq!(
            cook("\\x%%").unwrap_err().to_string(),
            "Invalid hexadecimal escape sequence"
        );
    }

    #[test]
    fn test_reject_incomplete_hex_no_digit_eof() {
        assert_eq!(
            cook("\\x").unwrap_err().to_string(),
            "Invalid hexadecimal escape sequence"
        );
    }

    #[test]
    fn test_expand_simple_unicode_escapes() {
        assert_eq!(
            cook("\\u0000 \\u3030").unwrap().unwrap(),
            "\u{0000} \u{3030}"
        );
    }

    #[test]
    fn test_expand_braced_unicode_escapes() {
        assert_eq!(cook("\\u{12345}").unwrap().unwrap(), "\u{12345}");
    }

    #[test]
    fn test_expand_surrogate_codepoint_escapes() {
        assert_eq!(cook("\\uDCBA \\uDEF0 \\u{DCBA} \\u{DEF0}").unwrap(), None);
    }

    #[test]
    fn test_expand_short_unicode_escapes() {
        assert_eq!(cook("\\u{A}").unwrap().unwrap(), "\u{A}");
    }

    #[test]
    fn test_expands_long_unicode_escapes() {
        assert_eq!(cook("\\u{000000000012345}").unwrap().unwrap(), "\u{12345}");
    }

    #[test]
    fn test_reject_incomplete_unicode_escapes_2_digits_out_of_4() {
        assert_eq!(
            cook("\\uA0$").unwrap_err().to_string(),
            "Invalid Unicode escape sequence"
        );
    }

    #[test]
    fn test_reject_incomplete_unicode_escapes_missing_closing_braces() {
        assert_eq!(
            cook("\\u{A").unwrap_err().to_string(),
            "Invalid Unicode escape sequence"
        );
    }

    #[test]
    fn test_reject_incomplete_unicode_escapes_invalid_character_in_the_braces() {
        assert_eq!(
            cook("\\u{A B}").unwrap_err().to_string(),
            "Invalid Unicode escape sequence"
        );
    }

    #[test]
    fn test_reject_large_unicode_escapes() {
        assert_eq!(
            cook("\\u{ABCDEF}").unwrap_err().to_string(),
            "Undefined Unicode code-point"
        );
    }

    #[test]
    fn test_remove_line_continuation() {
        assert_eq!(
            cook("[\\\n] [\\\u{2028}] [\\\u{2029}]").unwrap().unwrap(),
            "[] [] []"
        );
    }
}
