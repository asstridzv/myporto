
## Fix video upload so it stores immediately, shows real progress, and reopens correctly

### What I found
- The app is already designed to upload **one file only** and reuse that same media across all 4 platform previews. The 4 cards are not causing 4 uploads.
- The current problem is the **upload path itself**:
  - `PostEditor.tsx` inserts a `draft_media` row first with `uploaded: false`
  - then starts a **single-shot browser XHR** to storage
  - if that upload hangs or never completes, the row stays pending forever
- Your latest console log shows a **very large video** upload starting:
  - `size: 426477857` (~426 MB)
- That kind of upload is not reliable with the current “raw XHR upload one huge file” approach, which explains:
  - progress staying at `0%`
  - media never flipping to stored
  - draft reopening as `Upload pending`

### Implementation plan

#### 1. Replace the current raw video upload flow with a reliable immediate-upload flow
Update `src/components/editor/PostEditor.tsx` so file selection does this:

```text
Select media
→ ensure draft exists
→ upload ONE file to its final storage path immediately
→ show real progress while uploading
→ only mark media persisted after storage confirms success
→ then let Save Draft only save text / format / ordering
```

Key changes:
- Keep the “upload once, reuse across all previews” behavior
- Stop treating a DB row as saved media before the storage upload has actually succeeded
- Use the final storage path from the start: `userId/draftId/mediaId`

#### 2. Make progress reflect the real upload lifecycle
The progress bar should no longer sit at 0 with a fake saved state.

Changes:
- Keep a proper per-media state such as:
  - `queued`
  - `uploading`
  - `uploaded`
  - `failed`
- Only show “saved/stored” once the storage request has finished successfully
- If upload fails, show a clear retry state instead of leaving the item in silent limbo

#### 3. Fix the pending-row problem
The current logic creates a `draft_media` row before the file is actually stored, which is why drafts reopen with `Upload pending`.

Changes:
- Either:
  - create/update the `draft_media` row **after** upload success, or
  - if keeping a pending row, make sure failure cleanup and retry are handled robustly
- Save Draft should not create the illusion that media is already stored if the upload is still incomplete

#### 4. Keep Save Draft fast and separate from media transfer
Once upload-on-select is reliable, `Save draft` should only persist:
- post text
- format
- ordering of already-uploaded media

This avoids long “Saving…” states caused by video transfer during the save button flow.

#### 5. Make draft reload and dashboard thumbnails depend on completed uploads only
Update draft/dashboard loading logic so they only use media that actually exists in storage.

Changes:
- In the editor load flow, only render persisted remote media for completed uploads
- In `src/routes/dashboard.tsx`, only build thumbnails from media rows that are truly uploaded
- Keep the existing video still-frame thumbnail approach, but make it read only valid stored video objects

### Files to update
- `src/components/editor/PostEditor.tsx`
  - rewrite immediate upload flow
  - add real upload state/progress handling
  - prevent “saved but not actually uploaded” behavior
  - keep a single shared file across all platform previews
- `src/routes/dashboard.tsx`
  - use only completed media rows when generating thumbnails / reopening drafts

### Technical details
```text
Current:
select file
→ insert draft_media(uploaded=false)
→ start giant XHR upload
→ if upload hangs, DB says pending forever

Proposed:
select file
→ ensure draft exists
→ upload directly to final storage path with real progress
→ on success, persist media row as uploaded
→ Save Draft only saves post metadata
```

### Expected result
- Uploading a video starts immediately when selected
- The progress bar moves upward with the real upload
- The file is uploaded once, not 4 times
- When upload completes, the media is truly stored in backend storage
- Reopening the draft shows the actual video instead of `Upload pending`
- Dashboard video cards can generate a proper still thumbnail from the saved file
