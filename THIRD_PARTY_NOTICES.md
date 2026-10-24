# Third-party runtime

Browser C# execution uses WasmSharp by JakeYallop, version 0.10.2, licensed Apache-2.0.
Source: https://github.com/JakeYallop/WasmSharp
Package: https://www.npmjs.com/package/@wasmsharp/core/v/0.10.2
Runtime assets are loaded from the pinned unpkg package and retain their upstream license notices. WasmSharp packages Microsoft .NET and Roslyn components under their upstream licenses.

## Learning interface

Material Style 3.1.1 (MIT), Bootstrap 5.3.2 ancestry (MIT), CodeMirror 5 (MIT), Marked (MIT), DOMPurify (Apache-2.0 OR MPL-2.0), highlight.js (BSD-3-Clause), React and React DOM 18.3.1 (MIT), and Sucrase 3.35.0 (MIT) supply browser UI, Markdown, highlighting, and React previews. Pinned versions are recorded in package-lock.json; bundled notices are retained in vendor files.

## TeaVM Java practice compiler

The reviewed compiler, runtime support, and class libraries come from https://teavm.org/playground/ and https://github.com/konsoletyper/teavm-javac. TeaVM and teavm-javac are Apache-2.0; compiler components from OpenJDK are GPLv2 with the Classpath Exception. See https://www.apache.org/licenses/LICENSE-2.0 and https://openjdk.org/legal/gplv2+ce.html. Exact downloaded artifacts are recorded by SHA-256 in scripts/java-runtime.json.
