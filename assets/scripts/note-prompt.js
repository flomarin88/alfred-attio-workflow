#!/usr/bin/env osascript -l JavaScript

// Story 4.3 — multi-line note prompt via NSAlert + NSTextView.
//
// argv[0] = record display name (e.g. "Jane Doe") — interpolated into
//           the dialog title.
// argv[1] = prompt copy from `strings.t('notes.multiline-prompt', ...)`.
//
// Behavior:
//   - Displays an NSAlert with a scrollable multi-line NSTextView as
//     the accessoryView, OK + Cancel buttons.
//   - On OK: prints the typed body to stdout (newlines preserved),
//     exits 0.
//   - On Cancel: exits 1 with no stdout. The caller detects the
//     non-zero exit code and skips the API call (Story 4.3 AC).

ObjC.import('AppKit')

function run(argv) {
  const recordName = argv[0] || 'this record'
  const informative = argv[1] || `Add a note linked to ${recordName}`

  const alert = $.NSAlert.alloc.init
  alert.messageText = `Add note — ${recordName}`
  alert.informativeText = informative
  alert.addButtonWithTitle('OK')
  alert.addButtonWithTitle('Cancel')

  // 400 × 140 pt: enough for a few paragraphs without dominating the
  // screen. Scroll view + text view = multi-line input with vertical
  // scroll once content overflows.
  const frame = $.NSMakeRect(0, 0, 400, 140)
  const scrollView = $.NSScrollView.alloc.initWithFrame(frame)
  scrollView.hasVerticalScroller = true
  scrollView.borderType = $.NSBezelBorder
  scrollView.autohidesScrollers = true

  const textView = $.NSTextView.alloc.initWithFrame(frame)
  textView.editable = true
  textView.richText = false
  textView.usesFindBar = false
  textView.automaticQuoteSubstitutionEnabled = false
  textView.automaticDashSubstitutionEnabled = false
  textView.automaticTextReplacementEnabled = false
  textView.font = $.NSFont.systemFontOfSize(13)
  scrollView.documentView = textView

  alert.accessoryView = scrollView
  // The window starts focus on the first responder — the accessoryView
  // text view rather than the OK button — so the user can type
  // immediately without an extra Tab press.
  alert.window.initialFirstResponder = textView

  const response = alert.runModal
  // NSAlertFirstButtonReturn = 1000 (= OK). Cancel = 1001.
  if (response !== 1000) {
    $.exit(1)
  }
  const body = ObjC.unwrap(textView.string)
  $.NSFileHandle.fileHandleWithStandardOutput.writeData(
    $.NSString.alloc.initWithUTF8String(body).dataUsingEncoding($.NSUTF8StringEncoding),
  )
  return
}
