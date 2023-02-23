mod dedent_raw;

use std::collections::HashSet;
use std::mem;

use swc_core::common::DUMMY_SP;
use swc_core::common::util::take::Take;
use swc_core::ecma::ast::{
    Callee, Expr, ExprOrSpread, Id, Ident, ImportNamedSpecifier, ImportSpecifier, Lit, MemberProp,
    Module, ModuleDecl, ModuleExportName, ModuleItem, Program, TaggedTpl, SeqExpr, Number,
};
use swc_core::ecma::atoms::{Atom, JsWord};
use swc_core::ecma::visit::{as_folder, FoldWith, Visit, VisitMut, VisitMutWith};
use swc_core::plugin::{plugin_transform, proxies::TransformPluginProgramMetadata};

use crate::dedent_raw::dedent_raw;

#[plugin_transform]
pub fn process_transform(program: Program, _metadata: TransformPluginProgramMetadata) -> Program {
    program.fold_with(&mut as_folder(MainVisitor::new()))
}

struct MainVisitor {
    ids: Ids,
}

impl MainVisitor {
    fn new() -> Self {
        Self { ids: Ids::new() }
    }
}

impl VisitMut for MainVisitor {
    fn visit_mut_module(&mut self, n: &mut Module) {
        let imports = collect_imports(&self.ids, &n);
        if imports.is_empty() {
            return;
        }

        let mut v = TransformVisitor::new(self.ids.clone(), imports);
        v.visit_mut_module(n);

        let mut v = FindReferenceVisitor::new(v.removable_ids);
        v.visit_module(n);

        // TODO: use drain_filter once stabilized
        n.body = mem::take(&mut n.body)
            .into_iter()
            .flat_map(|item| {
                let mut item = Some(item);
                modify_import(&mut item, &v.removable_ids);
                item
            })
            .collect::<Vec<_>>();
    }
}

#[derive(Debug, Clone)]
struct Ids {
    dedent: JsWord,
    qnighy_dedent: JsWord,
}

impl Ids {
    fn new() -> Self {
        Self {
            dedent: JsWord::from("dedent"),
            qnighy_dedent: JsWord::from("@qnighy/dedent"),
        }
    }
}

struct TransformVisitor {
    ids: Ids,
    imports: Imports,
    removable_ids: HashSet<Id>,
}

impl TransformVisitor {
    fn new(ids: Ids, imports: Imports) -> Self {
        Self {
            ids,
            imports,
            removable_ids: HashSet::new(),
        }
    }
}

impl VisitMut for TransformVisitor {
    fn visit_mut_expr(&mut self, n: &mut Expr) {
        n.visit_mut_children_with(self);
        let Expr::TaggedTpl(ttpl) = n else {
            return;
        };
        let Some(dedent_id) = self.imports.detect_dedent_fn(&self.ids, &ttpl.tag) else {
            return;
        };
        let ttpl = n.take().tagged_tpl().unwrap();
        let mut tpl = ttpl.tpl;

        let quasis_orig = tpl
            .quasis
            .iter()
            .map(|elem| elem.raw.to_owned())
            .collect::<Vec<_>>();
        let quasis = dedent_raw(&quasis_orig);
        for (elem, new_quasi) in tpl.quasis.iter_mut().zip(&quasis) {
            elem.raw = Atom::new(new_quasi.as_str());
            // TODO: compute cooked correctly
            elem.cooked = None;
        }

        *n = Expr::Tpl(tpl);
        self.removable_ids.insert(dedent_id);
    }
    fn visit_mut_tagged_tpl(&mut self, n: &mut TaggedTpl) {
        n.visit_mut_children_with(self);
        let Expr::Call(tag_orig) = n.tag.unwrap_parens() else {
            return;
        };
        let Callee::Expr(callee) = &tag_orig.callee else {
            return;
        };
        let Some(dedent_id) = self.imports.detect_dedent_fn(&self.ids, callee) else {
            return;
        };
        if !matches!(
            tag_orig.args[..],
            [ExprOrSpread {
                spread: None,
                expr: _
            }]
        ) {
            return;
        }

        let mut tag_orig = n.tag.unwrap_parens_mut().take().call().unwrap();
        let arg = tag_orig.args.swap_remove(0).expr;
        n.tag = as_value(arg);

        let quasis_orig = n
            .tpl
            .quasis
            .iter()
            .map(|elem| elem.raw.to_owned())
            .collect::<Vec<_>>();
        let quasis = dedent_raw(&quasis_orig);
        for (elem, new_quasi) in n.tpl.quasis.iter_mut().zip(&quasis) {
            elem.raw = Atom::new(new_quasi.as_str());
            // TODO: compute cooked correctly
            elem.cooked = None;
        }
        self.removable_ids.insert(dedent_id);
    }
}

#[derive(Debug, Clone)]
struct Imports {
    dedent: HashSet<Id>,
    ns: HashSet<Id>,
}

impl Imports {
    fn is_empty(&self) -> bool {
        self.dedent.is_empty() && self.ns.is_empty()
    }

    fn detect_dedent_fn(&self, ids: &Ids, e: &Expr) -> Option<Id> {
        let e = e.unwrap_parens();
        match e {
            Expr::Ident(e) => {
                let id = e.to_id();
                if self.dedent.contains(&e.to_id()) {
                    return Some(id);
                }
            }
            Expr::Member(e) => {
                if let Some(obj) = e.obj.unwrap_parens().as_ident() {
                    let id = obj.to_id();
                    if self.ns.contains(&id)
                        && member_name(&e.prop)
                            .map(|name| *name == ids.dedent)
                            .unwrap_or(false)
                    {
                        return Some(id);
                    }
                }
            }
            _ => {}
        }
        None
    }
}

fn collect_imports(ids: &Ids, module: &Module) -> Imports {
    let mut imports = Imports {
        dedent: HashSet::new(),
        ns: HashSet::new(),
    };
    for stmt in &module.body {
        let Some(decl) = stmt.as_module_decl() else {
            continue;
        };
        let Some(decl) = decl.as_import() else {
            continue;
        };
        if decl.src.value != ids.qnighy_dedent {
            continue;
        }
        for spec in &decl.specifiers {
            match spec {
                ImportSpecifier::Named(spec) => {
                    if *import_name(spec) == ids.dedent {
                        let local = spec.local.to_id();
                        imports.dedent.insert(local);
                    }
                }
                ImportSpecifier::Namespace(spec) => {
                    let local = spec.local.to_id();
                    imports.ns.insert(local);
                }
                _ => {}
            }
        }
    }
    imports
}

#[derive(Debug)]
struct FindReferenceVisitor {
    removable_ids: HashSet<Id>,
}

impl FindReferenceVisitor {
    fn new(removable_ids: HashSet<Id>) -> Self {
        Self { removable_ids }
    }
}

impl Visit for FindReferenceVisitor {
    fn visit_import_specifier(&mut self, _n: &ImportSpecifier) {
        // skip
    }
    fn visit_ident(&mut self, n: &Ident) {
        self.removable_ids.remove(&n.to_id());
    }
}

fn modify_import(orig_item: &mut Option<ModuleItem>, removable_ids: &HashSet<Id>) {
    let Some(ModuleItem::ModuleDecl(ModuleDecl::Import(item))) = orig_item else {
        return;
    };
    let found = item
        .specifiers
        .iter()
        .any(|spec| removable_ids.contains(&local_name(spec).to_id()));
    if !found {
        return;
    }
    // TODO: use drain_filter once stabilized
    item.specifiers = mem::take(&mut item.specifiers)
        .into_iter()
        .filter_map(|spec| {
            if removable_ids.contains(&local_name(&spec).to_id()) {
                None
            } else {
                Some(spec)
            }
        })
        .collect::<Vec<_>>();
    if item.specifiers.is_empty() {
        *orig_item = None;
    }
}

fn as_value(expr: Box<Expr>) -> Box<Expr> {
    let inner = expr.unwrap_parens();
    if inner.is_member() || inner.as_opt_chain().map(|chain| chain.base.is_member()).unwrap_or(false) {
        // foo.bar`...` -> (0, foo.bar)`...`
        Box::new(SeqExpr {
            span: DUMMY_SP,
            exprs: vec![
                Box::new(
                    Lit::Num(Number {
                        span:DUMMY_SP,
                        value:0.0,
                        raw: None,
                    }).into(),
                ),
                expr,
            ],
        }.into())
    } else {
        expr
    }
}

fn member_name(prop: &MemberProp) -> Option<&JsWord> {
    match prop {
        MemberProp::Ident(prop) => Some(&prop.sym),
        MemberProp::Computed(prop) => match prop.expr.unwrap_parens() {
            Expr::Lit(Lit::Str(prop)) => Some(&prop.value),
            _ => None,
        },
        _ => None,
    }
}

fn import_name(spec: &ImportNamedSpecifier) -> &JsWord {
    if let Some(imported) = &spec.imported {
        match &imported {
            ModuleExportName::Ident(imported) => &imported.sym,
            ModuleExportName::Str(imported) => &imported.value,
        }
    } else {
        &spec.local.sym
    }
}

fn local_name(spec: &ImportSpecifier) -> &Ident {
    match spec {
        ImportSpecifier::Default(spec) => &spec.local,
        ImportSpecifier::Named(spec) => &spec.local,
        ImportSpecifier::Namespace(spec) => &spec.local,
    }
}

#[cfg(test)]
mod test_basic_behavior {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        transform_dedent_calls,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        transform_wrapping_dedent_calls,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(foo)`
  foo
  bar
`;
"#,
        r#"const text = foo`foo
bar
`;"#
    );
}

#[cfg(test)]
mod test_dedent_detection {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_other_template_literals,
        r#"`
  foo
  bar
`;
foo`
  foo
  bar
`;
foo.bar`
  foo
  bar
`;
foo(bar)`
  foo
  bar
`;
foo()`
  foo
  bar
`;
"#,
        r#"`
  foo
  bar
`;
foo`
  foo
  bar
`;
foo.bar`
  foo
  bar
`;
foo(bar)`
  foo
  bar
`;
foo()`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        detect_renamed_imports,
        r#"import { dedent as m } from "@qnighy/dedent";
const text = m`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        detect_string_imports,
        r#"import { "dedent" as dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        detect_simple_namespace_imports,
        r#"import * as m from "@qnighy/dedent";
const text = m.dedent`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        detect_namespace_imports_with_simple_computed_member_access,
        r#"import * as m from "@qnighy/dedent";
const text = m["dedent"]`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_namespace_imports_with_complex_computed_member_access,
        r#"import * as m from "@qnighy/dedent";
const text = m[dedent]`
  foo
  bar
`;
"#,
        r#"import * as m from "@qnighy/dedent";
const text = m[dedent]`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_non_namespace_member_expression_as_a_tag,
        r#"const text = foo.bar.baz`
  foo
  bar
`;
"#,
        r#"const text = foo.bar.baz`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_global_dedent,
        r#"const text = dedent`
  foo
  bar
`;
"#,
        r#"const text = dedent`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_other_imports,
        r#"import { dedentRaw as dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
        r#"import { dedentRaw as dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;"#
    );
}

#[cfg(test)]
mod test_escape_handling {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        // TODO
        ignore,
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        skip_transformation_if_there_is_an_invalid_escape_in_the_direct_form,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar\9
`;
"#,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar\9
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        transform_the_code_successfully_even_if_there_is_an_invalid_escape_in_the_wrapper_form,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(foo)`
  foo
  bar\9
`;
"#,
        r#"const text = foo`foo
bar\9
`;"#
    );
}

#[cfg(test)]
mod test_parsing_wrapped_expressions {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_wrapping_dedent_calls_with_too_few_arguments,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent()`
  foo
  bar
`;
"#,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent()`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_wrapping_dedent_calls_with_too_many_arguments,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(foo, bar)`
  foo
  bar
`;
"#,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(foo, bar)`
  foo
  bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        ignore_wrapping_dedent_calls_with_spreads,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(...foo)`
  foo
  bar
`;
"#,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(...foo)`
  foo
  bar
`;"#
    );
}

#[cfg(test)]
mod test_wrapped_functions_this_binding {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        transform_member_expression_with_as_value_wrapper,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent(foo.bar)`
  foo
  bar
`;
"#,
        r#"const text = (0, foo.bar)`foo
bar
`;"#
    );
}

#[cfg(test)]
mod test_import_removal {
    use super::*;
    use swc_core::ecma::transforms::testing::test;

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        remove_imports_in_the_simplest_case,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        remove_namespace_imports_as_well,
        r#"import * as m from "@qnighy/dedent";
const text = m.dedent`
  foo
  bar
`;
"#,
        r#"const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        remove_imports_even_if_there_are_multiple_uses,
        r#"import { dedent } from "@qnighy/dedent";
const text1 = dedent`
  foo
  bar
`;
const text2 = dedent`
  foo
  bar
`;
"#,
        r#"const text1 = `foo
bar
`;
const text2 = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        remove_only_the_import_specifier_if_other_imports_are_in_use,
        r#"import { dedent, dedentRaw } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
        r#"import { dedentRaw } from "@qnighy/dedent";
const text = `foo
bar
`;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        dont_remove_unused_ones,
        r#"import { dedent } from "@qnighy/dedent";
import { dedent as dedent2 } from "@qnighy/dedent";
import { dedent as dedent3 } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
dedent3;
"#,
        r#"import { dedent as dedent2 } from "@qnighy/dedent";
import { dedent as dedent3 } from "@qnighy/dedent";
const text = `foo
bar
`;
dedent3;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        dont_remove_imports_if_there_are_other_non_removable_uses,
        r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
dedent;
"#,
        r#"import { dedent } from "@qnighy/dedent";
const text = `foo
bar
`;
dedent;"#
    );

    test!(
        Default::default(),
        |_| as_folder(MainVisitor::new()),
        dont_remove_namespace_imports_if_there_are_other_non_removable_uses,
        r#"import * as m from "@qnighy/dedent";
const text = m.dedent`
  foo
  bar
`;
m.dedent;
"#,
        r#"import * as m from "@qnighy/dedent";
const text = `foo
bar
`;
m.dedent;"#
    );
}
