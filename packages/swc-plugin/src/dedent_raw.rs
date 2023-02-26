// NOTE: as the raw texts come from the source string, which in turn is encoded in UTF-8,
// they are known to be free of stray surrogates.
pub(crate) fn dedent_raw<S>(raw: &[S]) -> Vec<String>
where
    S: AsRef<str>,
{
    let mut level = usize::MAX / 2;
    for (i, elem) in raw.iter().enumerate() {
        let elem: &str = elem.as_ref();
        let mut last = 0;
        while let Some(pos) = find_newline(elem, last) {
            let end_pos = find_non_space(elem, pos);
            let len = end_pos - pos;
            let has_content = if end_pos < elem.len() {
                // There is a character in the line
                !has_newline_at(elem, end_pos)
            } else {
                // There is a substitution
                i + 1 < raw.len()
            };
            if has_content {
                level = level.min(len);
            }
            last = end_pos;
        }
    }
    let level = level;
    raw.iter()
        .map(|elem| {
            let elem: &str = elem.as_ref();
            let mut buf = String::with_capacity(elem.len());
            let mut last = 0;
            while let Some(pos) = find_newline(elem, last) {
                buf.push_str(&elem[last..pos]);
                let end_pos = find_non_space(elem, pos);
                let len = end_pos - pos;
                let trimmed_pos = pos + len.min(level);
                buf.push_str(&elem[trimmed_pos..end_pos]);

                last = end_pos;
            }
            buf.push_str(&elem[last..]);
            buf
        })
        .collect::<Vec<_>>()
}

fn find_newline(s: &str, from: usize) -> Option<usize> {
    let s: &[u8] = s.as_ref();
    let mut i = from;
    while i < s.len() {
        if let Some(len) = check_newline_at(s, i) {
            return Some(i + len);
        }
        i += 1;
    }
    None
}

fn has_newline_at(s: &str, i: usize) -> bool {
    check_newline_at(s, i).is_some()
}

fn check_newline_at<S>(s: &S, i: usize) -> Option<usize>
where
    S: AsRef<[u8]> + ?Sized,
{
    let s: &[u8] = s.as_ref();
    for &needle in &["\n", "\u{2028}", "\u{2029}"] {
        if s[i..].starts_with(needle.as_bytes()) {
            return Some(needle.len());
        }
    }
    None
}

fn find_non_space(s: &str, from: usize) -> usize {
    let s: &[u8] = s.as_ref();
    let mut i = from;
    while i < s.len() && (s[i] == b' ' || s[i] == b'\t') {
        i += 1;
    }
    i
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_do_not_remove_initial_spaces() {
        assert_eq!(dedent_raw(&["    foo bar "]), ["    foo bar "]);
    }
    #[test]
    fn test_do_not_remove_remove_initial_tabs() {
        assert_eq!(dedent_raw(&["\tfoo\tbar\t"]), ["\tfoo\tbar\t"]);
    }
    #[test]
    fn test_keep_empty_line_first_line_case() {
        assert_eq!(dedent_raw(&["\nfoo bar "]), ["\nfoo bar "]);
    }
    #[test]
    fn test_keep_the_last_newlines() {
        assert_eq!(dedent_raw(&["x\n\n\n"]), ["x\n\n\n"]);
    }
    #[test]
    fn test_keep_spaces_after_substitution() {
        assert_eq!(dedent_raw(&["foo", " bar"]), ["foo", " bar"]);
    }
    #[test]
    fn test_keep_spaces_after_bar() {
        assert_eq!(dedent_raw(&["foo", " bar"]), ["foo", " bar"]);
    }
    #[test]
    fn test_dedent_the_second_line_without_substitution() {
        assert_eq!(dedent_raw(&["foo\n  bar "]), ["foo\nbar "]);
    }
    #[test]
    fn test_dedent_the_second_line_with_substitution() {
        assert_eq!(dedent_raw(&["foo", "foo\n  bar "]), ["foo", "foo\nbar "]);
    }
    #[test]
    fn test_dedent_the_second_line_tab_case_without_substitution() {
        assert_eq!(dedent_raw(&["foo\n\t\tbar\t"]), ["foo\nbar\t"]);
    }
    #[test]
    fn test_dedent_the_second_line_tab_case_with_substitution() {
        assert_eq!(
            dedent_raw(&["foo", "foo\n\t\tbar\t"]),
            ["foo", "foo\nbar\t"]
        );
    }
    #[test]
    fn test_dedent_with_variable_indentation_1() {
        assert_eq!(dedent_raw(&["foo\nbar"]), ["foo\nbar"]);
    }
    #[test]
    fn test_dedent_with_variable_indentation_2() {
        assert_eq!(dedent_raw(&["foo\n bar"]), ["foo\nbar"]);
    }
    #[test]
    fn test_dedent_with_variable_indentation_3() {
        assert_eq!(dedent_raw(&["foo\n  bar"]), ["foo\nbar"]);
    }
    #[test]
    fn test_dedent_with_variable_indentation_4() {
        assert_eq!(dedent_raw(&["foo\n   bar"]), ["foo\nbar"]);
    }
    #[test]
    fn test_dedent_lines_using_max_common_indent_1() {
        assert_eq!(dedent_raw(&["foo\n  bar\n    baz"]), ["foo\nbar\n  baz"]);
    }
    #[test]
    fn test_dedent_lines_using_max_common_indent_2() {
        assert_eq!(dedent_raw(&["foo\n    bar\n  baz"]), ["foo\n  bar\nbaz"]);
    }
    #[test]
    fn test_truncate_short_empty_line_in_the_middle() {
        assert_eq!(
            dedent_raw(&["foo\n \n  bar\n    baz"]),
            ["foo\n\nbar\n  baz",]
        );
    }
    #[test]
    fn test_truncate_short_empty_line_in_the_last() {
        assert_eq!(
            dedent_raw(&["foo\n  bar\n    baz\n "]),
            ["foo\nbar\n  baz\n",]
        );
    }
    #[test]
    fn test_regard_substitution_as_a_content() {
        assert_eq!(
            dedent_raw(&["foo\n ", "\n  bar\n    baz"]),
            ["foo\n", "\n bar\n   baz",]
        );
    }
    #[test]
    fn test_dedent_long_empty_line() {
        assert_eq!(
            dedent_raw(&["foo\n   \n  bar\n    baz"]),
            ["foo\n \nbar\n  baz",]
        );
    }
    #[test]
    fn test_dedent_the_second_line_and_later_at_infinity_if_they_are_all_empty() {
        assert_eq!(
            dedent_raw(&["x\n  \u{2028}\t\n   \u{2029}\t\t"]),
            ["x\n\u{2028}\n\u{2029}",]
        );
    }
}
