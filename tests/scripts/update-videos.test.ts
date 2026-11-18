import { describe, expect, it } from 'vitest'
import { parseFeed, toVideosJson } from '../../scripts/update-videos.mjs'

// Same structure as YouTube's channel feed (feeds/videos.xml), trimmed to the
// fields the script reads plus the neighbours that could confuse a parser.
const entry = (id: string, title: string, published: string) => `
 <entry>
  <id>yt:video:${id}</id>
  <yt:videoId>${id}</yt:videoId>
  <yt:channelId>UCK-_0YkiGuvISUZQKN8PeNw</yt:channelId>
  <title>${title}</title>
  <link rel="alternate" href="https://www.youtube.com/watch?v=${id}"/>
  <author><name>Tom Harris Golf Coach</name></author>
  <published>${published}</published>
  <updated>${published}</updated>
  <media:group>
   <media:title>media copy of the title</media:title>
   <media:description>A description, which the script ignores.</media:description>
  </media:group>
 </entry>`

const feed = (...entries: string[]) => `<?xml version="1.0" encoding="UTF-8"?>
<feed xmlns:yt="http://www.youtube.com/xml/schemas/2015" xmlns:media="http://search.yahoo.com/mrss/" xmlns="http://www.w3.org/2005/Atom">
 <id>yt:channel:K-_0YkiGuvISUZQKN8PeNw</id>
 <title>Tom Harris Golf Coach</title>
 <published>2011-02-15T02:31:07+00:00</published>${entries.join('')}
</feed>`

describe('parseFeed', () => {
  it('reads id and title for each entry, not the channel title', () => {
    const videos = parseFeed(feed(entry('uJyV2APUtP8', 'The solid contact drill!', '2026-11-16T17:05:22+00:00')))
    expect(videos).toEqual([
      { id: 'uJyV2APUtP8', title: 'The solid contact drill!', published: '2026-11-16T17:05:22+00:00' },
    ])
  })

  it('puts the most recently published video first, whatever order the feed uses', () => {
    const videos = parseFeed(
      feed(
        entry('bE_G50bPrkg', 'Older', '2026-11-04T16:11:52+00:00'),
        entry('uJyV2APUtP8', 'Newest', '2026-11-16T17:05:22+00:00'),
        entry('cgeqVAZz824', 'Middle', '2026-11-13T16:12:51+00:00'),
      ),
    )
    expect(videos.map((v) => v.id)).toEqual(['uJyV2APUtP8', 'cgeqVAZz824', 'bE_G50bPrkg'])
  })

  it('decodes XML entities in titles exactly once', () => {
    const videos = parseFeed(
      feed(entry('uJyV2APUtP8', 'Chip &amp; run: the &quot;7&#39;s&quot; drill &lt;easy&gt; &#x2014; &amp;lt;', '2026-11-16T17:05:22+00:00')),
    )
    expect(videos[0]?.title).toBe('Chip & run: the "7\'s" drill <easy> — &lt;')
  })

  it('skips entries whose video id is not a YouTube id', () => {
    const videos = parseFeed(
      feed(
        entry('not an id', 'Bad', '2026-11-16T17:05:22+00:00'),
        entry('cgeqVAZz824', 'Good', '2026-11-13T16:12:51+00:00'),
      ),
    )
    expect(videos.map((v) => v.id)).toEqual(['cgeqVAZz824'])
  })

  it('returns nothing for a response that is not a feed', () => {
    expect(parseFeed('<html><body><h1>503 Service Unavailable</h1></body></html>')).toEqual([])
    expect(parseFeed('')).toEqual([])
  })
})

describe('toVideosJson', () => {
  it('writes the {"videos":[{"id","title"}]} shape the site reads, and nothing else', () => {
    const json = toVideosJson([
      { id: 'uJyV2APUtP8', title: 'The solid contact drill!', published: '2026-11-16T17:05:22+00:00' },
    ])
    expect(JSON.parse(json)).toEqual({ videos: [{ id: 'uJyV2APUtP8', title: 'The solid contact drill!' }] })
    expect(json.endsWith('\n')).toBe(true)
  })
})
