mod dedent_raw;

use std::collections::HashSet;

use swc_core::common::util::take::Take;
use swc_core::ecma::ast::{Program, ImportSpecifier, ModuleExportName, ImportNamedSpecifier, Id, TaggedTpl, Expr, MemberProp, Lit, Callee, ExprOrSpread, Module};
use swc_core::ecma::transforms::testing::test;
use swc_core::ecma::visit::{as_folder, FoldWith, VisitMut, VisitMutWith};
use swc_core::ecma::atoms::{JsWord, Atom};
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
        Self {
            ids: Ids::new(),
        }
    }
}

impl VisitMut for MainVisitor {
    fn visit_mut_module(&mut self, n: &mut Module) {
        let imports = collect_imports(&self.ids, &n);
        if !imports.is_empty() {
            TransformVisitor { ids: self.ids.clone(), imports }.visit_mut_module(n);
        }
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
}

impl VisitMut for TransformVisitor {
    fn visit_mut_expr(&mut self, n: &mut Expr) {
        n.visit_mut_children_with(self);
        let Expr::TaggedTpl(ttpl) = n else {
            return;
        };
        if !self.imports.is_dedent_fn(&self.ids, &ttpl.tag) {
            return;
        }
        let ttpl = n.take().tagged_tpl().unwrap();
        let mut tpl = ttpl.tpl;

        let quasis_orig = tpl.quasis.iter().map(|elem| elem.raw.to_owned()).collect::<Vec<_>>();
        let quasis = dedent_raw(&quasis_orig);
        for (elem, new_quasi) in tpl.quasis.iter_mut().zip(&quasis) {
            elem.raw = Atom::new(new_quasi.as_str());
            // TODO: compute cooked correctly
            elem.cooked = None;
        }

        *n = Expr::Tpl(tpl);
    }
    fn visit_mut_tagged_tpl(&mut self, n: &mut TaggedTpl) {
        n.visit_mut_children_with(self);
        let Expr::Call(tag_orig) = n.tag.unwrap_parens() else {
            return;
        };
        let Callee::Expr(callee) = &tag_orig.callee else {
            return;
        };
        if !self.imports.is_dedent_fn(&self.ids, callee) {
            return;
        }
        if !matches!(tag_orig.args[..], [ExprOrSpread { spread: None, expr: _ }]) {
            return;
        }

        let mut tag_orig = n.tag.unwrap_parens_mut().take().call().unwrap();
        let arg = tag_orig.args.swap_remove(0).expr;
        n.tag = arg;
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

    fn is_dedent_fn(&self, ids: &Ids, e: &Expr) -> bool {
        let e = e.unwrap_parens();
        match e {
            Expr::Ident(e) => self.dedent.contains(&e.to_id()),
            Expr::Member(e) => {
                if let Some(obj) = e.obj.unwrap_parens().as_ident() {
                    self.ns.contains(&obj.to_id()) && member_name(&e.prop).map(|name| *name == ids.dedent).unwrap_or(false)
                } else {
                    false
                }
            }
            _ => false,
        }
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

// An example to test plugin transform.
// Recommended strategy to test plugin's transform is verify
// the Visitor's behavior, instead of trying to run `process_transform` with mocks
// unless explicitly required to do so.
test!(
    Default::default(),
    |_| as_folder(MainVisitor::new()),
    transform_dedent_calls,
    // Input codes
    r#"import { dedent } from "@qnighy/dedent";
const text = dedent`
  foo
  bar
`;
"#,
    // Output codes after transformed with plugin
    r#"import { dedent } from "@qnighy/dedent";
const text = `foo
bar
`;"#
);
