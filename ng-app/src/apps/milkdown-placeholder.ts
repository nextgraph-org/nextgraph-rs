/**
MIT License

Copyright (c) 2022 Mox

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

Source: https://github.com/HexMox/milkdown-plugin-placeholder
 */

import type { MilkdownPlugin, TimerType } from '@milkdown/ctx'
import type { EditorView } from '@milkdown/prose/view'
import { createSlice, createTimer } from '@milkdown/ctx'
import { InitReady, prosePluginsCtx } from '@milkdown/core'
import { Plugin, PluginKey } from '@milkdown/prose/state'

export const placeholderCtx = createSlice('Please input here...', 'placeholder')
export const placeholderTimerCtx = createSlice([] as TimerType[], 'editorStateTimer')

export const PlaceholderReady = createTimer('PlaceholderReady')

const key = new PluginKey('MILKDOWN_PLACEHOLDER')

export const placeholder: MilkdownPlugin = (ctx) => {
  ctx.inject(placeholderCtx).inject(placeholderTimerCtx, [InitReady]).record(PlaceholderReady)

  return async () => {
    await ctx.waitTimers(placeholderTimerCtx)

    const prosePlugins = ctx.get(prosePluginsCtx)

    const update = (view: EditorView) => {
      const placeholder = ctx.get(placeholderCtx)
      const doc = view.state.doc
      if (
        view.editable &&
        doc.childCount === 1 &&
        doc.firstChild?.isTextblock &&
        doc.firstChild?.content.size === 0 &&
        doc.firstChild?.type.name === 'paragraph'
      ) {
        view.dom.classList.add('editor_empty');
        view.dom.setAttribute('data-placeholder', placeholder);
      } else {
        view.dom.classList.remove('editor_empty');
      }
    }

    const plugins = [
      ...prosePlugins,
      new Plugin({
        key,
        // props: {
        //   decorations(state) {
        //     const doc = state.doc
        //     if (
        //       doc.childCount === 1 &&
        //       doc.firstChild?.isTextblock &&
        //       doc.firstChild?.content.size === 0
        //     ) {
        //       return DecorationSet.create(doc, [
        //         Decoration.widget(1, (view) => {
        //           if (view.editable) {
        //             const span = document.createElement('span')
        //             span.classList.add('placeholder')
        //             span.textContent = placeholder
        //             return span
        //           }
        //         }),
        //       ])
        //     }
        //   },
        // },
        view(view) {
          update(view)

          return { update }
        },
      }),
    ]

    ctx.set(prosePluginsCtx, plugins)

    ctx.done(PlaceholderReady)
  }
}