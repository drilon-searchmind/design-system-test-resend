// icons.jsx — lightweight, stroke-based icon set
// All 16×16 by default, currentColor stroke. Single <path>/<g> where possible.

const Icon = ({ d, children, size = 16, stroke = 1.6, style, ...rest }) => (
  <svg width={size} height={size} viewBox="0 0 16 16" fill="none"
       stroke="currentColor" strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round"
       style={{ flexShrink: 0, ...style }} {...rest}>
    {d ? <path d={d} /> : children}
  </svg>
);

const Icons = {
  Home:      (p) => <Icon {...p} d="M2.5 7L8 2.5 13.5 7v6.5a1 1 0 0 1-1 1H3.5a1 1 0 0 1-1-1V7z M6 14.5V10h4v4.5" />,
  Users:     (p) => <Icon {...p}><circle cx="6" cy="6" r="2.2"/><path d="M2 13.5c0-2.2 1.8-4 4-4s4 1.8 4 4"/><path d="M10.5 5.5a2 2 0 0 1 0 4"/><path d="M11.5 13.5c0-1.6-1-3-2.5-3.6"/></Icon>,
  User:      (p) => <Icon {...p}><circle cx="8" cy="5.5" r="2.5"/><path d="M3 14c0-2.5 2.2-4.5 5-4.5s5 2 5 4.5"/></Icon>,
  Clock:     (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M8 5v3l2 1.5"/></Icon>,
  Chart:     (p) => <Icon {...p}><path d="M2.5 13.5h11M4.5 11V8M7.5 11V4.5M10.5 11V7M13 11V9"/></Icon>,
  Settings:  (p) => <Icon {...p}><circle cx="8" cy="8" r="2"/><path d="M8 1.5v2M8 12.5v2M1.5 8h2M12.5 8h2M3.3 3.3l1.4 1.4M11.3 11.3l1.4 1.4M3.3 12.7l1.4-1.4M11.3 4.7l1.4-1.4"/></Icon>,
  Search:    (p) => <Icon {...p}><circle cx="7" cy="7" r="4.5"/><path d="M10.5 10.5L14 14"/></Icon>,
  Plus:      (p) => <Icon {...p} d="M8 3v10M3 8h10"/>,
  Minus:     (p) => <Icon {...p} d="M3 8h10"/>,
  Check:     (p) => <Icon {...p} d="M3 8.5L6.5 12 13 4.5"/>,
  X:         (p) => <Icon {...p} d="M4 4l8 8M12 4l-8 8"/>,
  ChevronR:  (p) => <Icon {...p} d="M6 3l5 5-5 5"/>,
  ChevronL:  (p) => <Icon {...p} d="M10 3L5 8l5 5"/>,
  ChevronD:  (p) => <Icon {...p} d="M3 6l5 5 5-5"/>,
  ChevronU:  (p) => <Icon {...p} d="M3 10l5-5 5 5"/>,
  Play:      (p) => <Icon {...p}><path d="M4 3.5v9l8-4.5-8-4.5z" fill="currentColor" stroke="none"/></Icon>,
  Pause:     (p) => <Icon {...p}><rect x="4" y="3" width="2.5" height="10" fill="currentColor" stroke="none" rx="0.5"/><rect x="9.5" y="3" width="2.5" height="10" fill="currentColor" stroke="none" rx="0.5"/></Icon>,
  Stop:      (p) => <Icon {...p}><rect x="4" y="4" width="8" height="8" rx="1" fill="currentColor" stroke="none"/></Icon>,
  Bell:      (p) => <Icon {...p}><path d="M4 11V7.5a4 4 0 1 1 8 0V11l1 1.5H3L4 11z"/><path d="M6.5 13.5a1.5 1.5 0 0 0 3 0"/></Icon>,
  Alert:     (p) => <Icon {...p}><path d="M8 2L1.5 13.5h13L8 2z"/><path d="M8 6.5v3"/><circle cx="8" cy="11.5" r="0.6" fill="currentColor" stroke="none"/></Icon>,
  Doc:       (p) => <Icon {...p}><path d="M3.5 1.5h6L12.5 4.5v9a1 1 0 0 1-1 1h-8a1 1 0 0 1-1-1V2.5a1 1 0 0 1 1-1z"/><path d="M9.5 1.5v3h3"/></Icon>,
  Drive:     (p) => <Icon {...p}><path d="M5.5 2.5h5L14 9l-1.5 3h-9L2 9l3.5-6.5z"/><path d="M5.5 2.5L9 9H2M10.5 2.5L14 9l-4 3"/></Icon>,
  Mail:      (p) => <Icon {...p}><rect x="2" y="3.5" width="12" height="9" rx="1"/><path d="M2.5 4.5L8 9l5.5-4.5"/></Icon>,
  Phone:     (p) => <Icon {...p}><path d="M3 2.5h2.5l1 3-1.5 1a8 8 0 0 0 3.5 3.5l1-1.5 3 1V12a1.5 1.5 0 0 1-1.5 1.5A10.5 10.5 0 0 1 1.5 3 1.5 1.5 0 0 1 3 1.5z" transform="translate(.5 .5)"/></Icon>,
  Note:      (p) => <Icon {...p}><path d="M2.5 2.5h11v11h-11z"/><path d="M5 5.5h6M5 8h6M5 10.5h4"/></Icon>,
  Logout:    (p) => <Icon {...p}><path d="M9 2.5H3.5a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1H9"/><path d="M11 5.5L13.5 8 11 10.5M13.5 8H6"/></Icon>,
  Google:    (p) => <Icon {...p}><path d="M14.5 8.2c0-.5 0-1-.1-1.4H8v2.7h3.7a3.2 3.2 0 0 1-1.4 2.1v1.7h2.2c1.3-1.2 2-3 2-5.1z" fill="#4285F4" stroke="none"/><path d="M8 15c1.9 0 3.5-.6 4.6-1.7l-2.2-1.7c-.6.4-1.4.7-2.3.7a4 4 0 0 1-3.8-2.8h-2.3v1.7A7 7 0 0 0 8 15z" fill="#34A853" stroke="none"/><path d="M4.2 9.5a4.2 4.2 0 0 1 0-2.7V5H2A7 7 0 0 0 2 11l2.2-1.5z" fill="#FBBC04" stroke="none"/><path d="M8 4.4c1 0 2 .3 2.7 1l2-2A7 7 0 0 0 8 1.5a7 7 0 0 0-6.3 3.8L4 7a4 4 0 0 1 4-2.6z" fill="#EA4335" stroke="none"/></Icon>,
  Shield:    (p) => <Icon {...p}><path d="M8 1.5L2.5 3.5V8c0 3.5 2.5 5.5 5.5 6.5 3-1 5.5-3 5.5-6.5V3.5L8 1.5z"/></Icon>,
  Lock:      (p) => <Icon {...p}><rect x="3" y="7" width="10" height="7" rx="1"/><path d="M5 7V5a3 3 0 0 1 6 0v2"/></Icon>,
  Menu:      (p) => <Icon {...p} d="M2.5 4h11M2.5 8h11M2.5 12h11"/>,
  MenuL:     (p) => <Icon {...p} d="M2.5 4h11M2.5 8h7M2.5 12h11"/>,
  Grid:      (p) => <Icon {...p}><rect x="2" y="2" width="5" height="5" rx="0.5"/><rect x="9" y="2" width="5" height="5" rx="0.5"/><rect x="2" y="9" width="5" height="5" rx="0.5"/><rect x="9" y="9" width="5" height="5" rx="0.5"/></Icon>,
  List:      (p) => <Icon {...p}><path d="M2 4h12M2 8h12M2 12h12"/><circle cx="2.5" cy="4" r="0.4" fill="currentColor"/></Icon>,
  Filter:    (p) => <Icon {...p} d="M2 3h12l-4.5 5.5V13L6.5 11.5V8.5L2 3z"/>,
  Sun:       (p) => <Icon {...p}><circle cx="8" cy="8" r="3"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.5 1.5M11.5 11.5L13 13M3 13l1.5-1.5M11.5 4.5L13 3"/></Icon>,
  Moon:      (p) => <Icon {...p} d="M12.5 9a5 5 0 0 1-6.5-6.5A5.5 5.5 0 1 0 12.5 9z"/>,
  Sparkle:   (p) => <Icon {...p}><path d="M5 2v2M5 4c-1.5 0-3 1-3 2M5 4c1.5 0 3 1 3 2M5 4v0M5 6v0"/><path d="M11 7l.7 2 2 .7-2 .7L11 12.5l-.7-2-2-.7 2-.7L11 7z" fill="currentColor" stroke="none"/></Icon>,
  Tag:       (p) => <Icon {...p}><path d="M2.5 2.5H7L13.5 9a1 1 0 0 1 0 1.4l-3 3a1 1 0 0 1-1.4 0L2.5 7V2.5z"/><circle cx="5" cy="5" r="0.8"/></Icon>,
  Flag:      (p) => <Icon {...p}><path d="M3 2v12M3 3h8.5l-1.5 3 1.5 3H3"/></Icon>,
  Target:    (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><circle cx="8" cy="8" r="3.5"/><circle cx="8" cy="8" r="1" fill="currentColor"/></Icon>,
  TrendUp:   (p) => <Icon {...p}><path d="M2 11L6 7l3 3 5-6"/><path d="M10 5h4v4"/></Icon>,
  TrendDn:   (p) => <Icon {...p}><path d="M2 5l4 4 3-3 5 6"/><path d="M10 11h4V7"/></Icon>,
  Link:      (p) => <Icon {...p}><path d="M6.5 9.5l3-3M5 11a2.8 2.8 0 0 1 0-4L7 5M9 11l2-2a2.8 2.8 0 0 0-4-4"/></Icon>,
  Edit:      (p) => <Icon {...p}><path d="M11 2.5l2.5 2.5L5 13.5H2.5V11L11 2.5z"/></Icon>,
  Dots:      (p) => <Icon {...p}><circle cx="3" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="8" cy="8" r="1" fill="currentColor" stroke="none"/><circle cx="13" cy="8" r="1" fill="currentColor" stroke="none"/></Icon>,
  Building:  (p) => <Icon {...p}><path d="M2.5 13.5V4.5l5-2 5 2v9"/><path d="M2.5 13.5h10M5 7h2M8.5 7h2M5 10h2M8.5 10h2"/></Icon>,
  Calendar:  (p) => <Icon {...p}><rect x="2" y="3.5" width="12" height="10" rx="1"/><path d="M2 6h12M5 2v3M11 2v3"/></Icon>,
  Download:  (p) => <Icon {...p}><path d="M8 2v8M5 7l3 3 3-3M3 13h10"/></Icon>,
  Globe:     (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M2 8h12M8 2c2 2 2 10 0 12M8 2c-2 2-2 10 0 12"/></Icon>,
  Briefcase: (p) => <Icon {...p}><rect x="2" y="4.5" width="12" height="9" rx="1"/><path d="M6 4.5V3h4v1.5M2 8h12"/></Icon>,
  Pause2:    (p) => <Icon {...p}><circle cx="8" cy="8" r="6"/><path d="M6.5 6v4M9.5 6v4"/></Icon>,
};

window.Icons = Icons;
