# IAU 24h World Championships 2025 - Predictions

Team and individual runner predictions for the **IAU 24h World Championships 2025** in Albi, France (October 17-19, 2025).

🌐 **Live Site**: [iau24hwc.ultramarathon.se](https://iau24hwc.ultramarathon.se)

## Features

- 📊 **Team Rankings** - Predicted team results based on runner performance data
- 🏃 **Individual Predictions** - Runner rankings with All-Time and Last 3 Years PBs
- 🌍 **200+ Country Support** - Complete IOC code mappings with flags
- 🔄 **DUV Integration** - Automatic performance data from Deutsche Ultramarathon Vereinigung
- ✏️ **Manual Matching** - Review and match runners to their DUV profiles
- 📱 **Responsive Design** - Modern UI built with Next.js 15 and Tailwind CSS

## Tech Stack

- **Framework**: Next.js 15 (App Router)
- **Language**: TypeScript
- **Database**: SQLite with better-sqlite3
- **UI**: shadcn/ui + Tailwind CSS
- **Data Source**: DUV API
- **Deployment**: Vercel

## Local Development

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Type checking
npm run type-check
```

## Database Setup

The SQLite database (`iau24hwc.db`) stores:
- Runner entries from IAU entry list
- DUV performance data and personal bests
- Match status for each runner
- Pre-calculated team rankings

See `lib/db/schema.sql` for the complete schema.

## Data Sources

- **Entry List**: Official IAU 24h WC 2025 entry list (PDF)
- **Performance Data**: [DUV Statistics](https://statistik.d-u-v.org/)
- **API Endpoint**: `https://statistik.d-u-v.org/json/mgetresultperson.php`

## License

MIT

---

Built for the ultrarunning community 🏃‍♂️🏃‍♀️
