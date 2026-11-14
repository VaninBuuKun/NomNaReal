#!/usr/bin/env python3
"""
NomNa Production-Grade Mock Dataset Seeder
=========================================
Seeds:
  - 120 Users (All passwords: '123456' with ASP.NET Core Identity HMAC-SHA512 PBKDF2 v3 hash)
  - 15 Diverse, Realistic Tech Servers (20-95 members per server)
  - Full server roles, channels, categories, and channel memberships
  - Real conversations and chat messages across channels
  - Rich friendships (Accepted, Pending, Blocked) and Direct Message conversations

Usage:
  python3 scripts/seed_production_workspace.py | docker exec -i nomna_postgres psql -U db_user -d NomNa
"""

import os
import sys
import uuid
import time
import base64
import struct
import random
import hashlib
from datetime import datetime, timedelta, timezone

def uuidv7():
    ms = int(time.time() * 1000)
    rand_bytes = os.urandom(10)
    time_bytes = ms.to_bytes(6, byteorder='big')
    b = bytearray(16)
    b[0:6] = time_bytes
    b[6] = 0x70 | (rand_bytes[0] & 0x0F)
    b[7] = rand_bytes[1]
    b[8] = 0x80 | (rand_bytes[2] & 0x3F)
    b[9:16] = rand_bytes[3:10]
    return str(uuid.UUID(bytes=bytes(b)))

def hash_identity_v3(password: str) -> str:
    salt = os.urandom(16)
    iter_count = 100000
    subkey = hashlib.pbkdf2_hmac('sha512', password.encode('utf-8'), salt, iter_count, 32)
    output = bytearray([1])
    output.extend(struct.pack('>I', 2)) # HMACSHA512
    output.extend(struct.pack('>I', iter_count))
    output.extend(struct.pack('>I', 16))
    output.extend(salt)
    output.extend(subkey)
    return base64.b64encode(output).decode('utf-8')

# Precompute a stable password hash for 123456 so generation is super fast
DEFAULT_PASSWORD_HASH = hash_identity_v3("123456")

# Permissions constants matching NomNa.Domain.Enums.Permissions
VIEW_CHANNEL = 1 << 9
SEND_MESSAGES = 1 << 10
SEND_MESSAGES_THREADS = 1 << 11
EMBED_LINKS = 1 << 14
ATTACH_FILES = 1 << 15
ADD_REACTIONS = 1 << 16
READ_HISTORY = 1 << 21
CONNECT = 1 << 22
SPEAK = 1 << 23
CREATE_INVITE = 1 << 6
CHANGE_NICKNAME = 1 << 7

PERMS_DEFAULT = VIEW_CHANNEL | SEND_MESSAGES | SEND_MESSAGES_THREADS | EMBED_LINKS | ATTACH_FILES | ADD_REACTIONS | READ_HISTORY | CONNECT | SPEAK | CREATE_INVITE | CHANGE_NICKNAME
PERMS_ADMIN = 1 << 0
PERMS_MOD = PERMS_DEFAULT | (1 << 4) | (1 << 19) | (1 << 24) # Kick, ManageMessages, Mute
PERMS_VIP = PERMS_DEFAULT | (1 << 12) | (1 << 17)

FIRST_NAMES_VN = ["Anh", "Bảo", "Bình", "Cường", "Dũng", "Dương", "Đạt", "Đức", "Giang", "Hải", "Hiếu", "Hoàng", "Huy", "Hùng", "Khang", "Khoa", "Kiên", "Lâm", "Long", "Minh", "Nam", "Nghĩa", "Nguyên", "Nhật", "Phong", "Phúc", "Quân", "Quang", "Sơn", "Tài", "Tâm", "Thắng", "Thành", "Thịnh", "Tiến", "Toàn", "Trí", "Trung", "Trường", "Tuấn", "Tùng", "Việt", "Vinh", "Vũ"]
MID_NAMES_VN = ["Văn", "Đức", "Thành", "Hữu", "Gia", "Quang", "Minh", "Thanh", "Hoàng", "Xuân", "Thái", "Tuấn", "Bảo", "Đăng", "Đình", "Trọng", "Duy", "Khánh", "Ngọc", "Thế"]
LAST_NAMES_VN = ["Nguyễn", "Trần", "Lê", "Phạm", "Hoàng", "Huỳnh", "Phan", "Vũ", "Võ", "Đặng", "Bùi", "Đỗ", "Hồ", "Ngô", "Dương", "Lý"]

FIRST_NAMES_GLOBAL = ["Alex", "Elena", "Marcus", "Sophia", "Lucas", "Liam", "Chen", "Yuki", "Kenji", "Chloe", "Arjun", "Matteo", "Emma", "David", "Sarah", "Daniel", "Oliver", "Maya", "Hannah", "Leo"]
LAST_NAMES_GLOBAL = ["Vance", "Rodriguez", "Smith", "Taylor", "Silva", "Muller", "Wei", "Tanaka", "Sato", "Dupont", "Sharma", "Rossi", "Watson", "Kim", "Park", "Johnson", "Brown", "Miller", "Davis", "Wilson"]

BIOS = [
    "Senior .NET & Cloud Architect | Passionate about Clean Architecture",
    "Frontend Engineer | React 18, Vite, Tailwind CSS & Micro-frontends",
    "DevOps & SRE | Kubernetes, Docker, Terraform & CI/CD Pipelines",
    "Fullstack Developer | Building high-scale distributed systems",
    "Mobile Craftsman | Flutter, Swift & React Native",
    "Database Enthusiast | PostgreSQL tuning, Redis caching & Kafka",
    "Security Researcher | OWASP, Application Security & Cryptography",
    "UI/UX Designer & Design Systems Advocate",
    "AI/ML Engineer | PyTorch, LLMs, Prompt Engineering & Agents",
    "Code, Coffee & Clean Commits ☕",
    "Indie Hacker | Building SaaS products in public 🚀",
    "Tech Lead | Mentoring engineers & scaling systems",
    "Gamer, Coder & Lo-Fi music lover 🎧",
    "Open Source Contributor & Linux enthusiast"
]

SERVER_SPECS = [
    {
        "name": "Nexus Dev Community",
        "code": "NEXUS-DEV",
        "desc": "Trung tâm kỹ thuật chính thức của cộng đồng NomNa — .NET 9, React & Clean Architecture",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=NexusDev",
        "min_members": 80, "max_members": 95,
        "categories": [
            {
                "name": "📢 THÔNG BÁO",
                "channels": [
                    {"name": "thong-bao-chung", "topic": "Kênh thông báo các bản release và cập nhật hệ thống"},
                    {"name": "noi-quy", "topic": "Văn hóa chia sẻ và quy tắc ứng xử trong server"}
                ]
            },
            {
                "name": "💬 THẢO LUẬN KỸ THUẬT",
                "channels": [
                    {"name": "general-chat", "topic": "Trò chuyện tự do mọi chủ đề công nghệ"},
                    {"name": "backend-dotnet", "topic": "Chuyên đề .NET 9, EF Core, CQRS & Clean Architecture"},
                    {"name": "frontend-react", "topic": "Chuyên đề React 18, Tailwind CSS, Zustand & TanStack Query"},
                    {"name": "hoi-dap-bug", "topic": "Kênh cứu hộ gỡ rối bug và review code"}
                ]
            },
            {
                "name": "🔊 VOICE ROOMS",
                "channels": [
                    {"name": "Phòng Họp Kỹ Thuật", "type": 1, "topic": "Phòng họp voice P2P cho team core"}
                ]
            }
        ]
    },
    {
        "name": "Hội Lập Trình Viên Việt Nam",
        "code": "DEV-VN",
        "desc": "Cộng đồng lập trình viên Việt Nam — Chia sẻ kiến thức, kinh nghiệm và cơ hội nghề nghiệp",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=DevVN",
        "min_members": 85, "max_members": 98,
        "categories": [
            {
                "name": "📌 CHUNG",
                "channels": [
                    {"name": "chao-mung", "topic": "Giao lưu giới thiệu bản thân"},
                    {"name": "tin-tuc-it", "topic": "Điểm tin công nghệ trong ngày"}
                ]
            },
            {
                "name": "💻 CHUYÊN MÔN",
                "channels": [
                    {"name": "lap-trinh-web", "topic": "Thảo luận về Fullstack Web Development"},
                    {"name": "tuyen-dung-viec-lam", "topic": "Cơ hội việc làm IT từ Intern đến Principal"},
                    {"name": "goc-tra-da", "topic": "Chém gió, meme công nghệ và đời sống dev"}
                ]
            }
        ]
    },
    {
        "name": "Cloud & DevOps Vietnam",
        "code": "CLOUDOPS",
        "desc": "Hạ tầng đám mây, Containerization, Kubernetes, CI/CD, Terraform và SRE Practices",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=CloudOps",
        "min_members": 50, "max_members": 70,
        "categories": [
            {
                "name": "☁️ CLOUD PLATFORMS",
                "channels": [
                    {"name": "aws-gcp-azure", "topic": "Thảo luận kiến trúc Multi-Cloud"},
                    {"name": "docker-k8s", "topic": "Triển khai microservices với Kubernetes"}
                ]
            },
            {
                "name": "🛠️ CI/CD & MONITORING",
                "channels": [
                    {"name": "github-actions", "topic": "Xây dựng automation pipeline chất lượng cao"},
                    {"name": "grafana-prometheus", "topic": "Giám sát hệ thống và phân tích sự cố"}
                ]
            }
        ]
    },
    {
        "name": "Frontend Masters (React & TS)",
        "code": "FE-MASTERS",
        "desc": "Kỹ thuật chuyên sâu Frontend: Performance, Design Systems, State Management & Animation",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=FEMasters",
        "min_members": 65, "max_members": 80,
        "categories": [
            {
                "name": "🎨 UI / UX",
                "channels": [
                    {"name": "react-ecosystem", "topic": "React 19, Server Components và Hooks nâng cao"},
                    {"name": "tailwind-design-tokens", "topic": "Quy chuẩn semantic tokens và theme switcher"}
                ]
            },
            {
                "name": "⚡ PERFORMANCE",
                "channels": [
                    {"name": "bundle-optimization", "topic": "Code-splitting, Vite config và Tree-shaking"},
                    {"name": "showcase-ui", "topic": "Khoe component và demo visual đẹp mắt"}
                ]
            }
        ]
    },
    {
        "name": "Backend Titans (.NET & Java)",
        "code": "BE-TITANS",
        "desc": "Kiến trúc hệ thống lớn, Concurrency, High Throughput, Event-Driven & Domain-Driven Design",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=BETitans",
        "min_members": 70, "max_members": 88,
        "categories": [
            {
                "name": "🏛️ ARCHITECTURE",
                "channels": [
                    {"name": "clean-architecture", "topic": "Thảo luận CQRS, MediatR và Domain Events"},
                    {"name": "distributed-systems", "topic": "Thiết kế hệ thống chịu tải cao và gỡ bottleneck"}
                ]
            },
            {
                "name": "🚀 PERFORMANCE",
                "channels": [
                    {"name": "async-concurrency", "topic": "Tối ưu hóa ThreadPool, Channels và Memory Allocation"},
                    {"name": "benchmark-lab", "topic": "Kết quả đo lường hiệu năng BenchmarkDotNet và k6"}
                ]
            }
        ]
    },
    {
        "name": "Game Dev & Unity Vietnam",
        "code": "GAMEDEV-VN",
        "desc": "Cộng đồng phát triển game: Unity, Unreal Engine, Godot, C#, 3D Modeling & Game Design",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=GameDevVN",
        "min_members": 35, "max_members": 50,
        "categories": [
            {
                "name": "🎮 ENGINES",
                "channels": [
                    {"name": "unity-corner", "topic": "Thảo luận Unity 6, DOTS và Shader Graph"},
                    {"name": "unreal-lounge", "topic": "Unreal Engine 5, Lumen và Blueprints"}
                ]
            },
            {
                "name": "🎨 ASSETS & SHOWCASE",
                "channels": [
                    {"name": "showcase-game", "topic": "Demo gameplay và nhận feedback"},
                    {"name": "game-jams", "topic": "Lập đội tham gia các cuộc thi Game Jam"}
                ]
            }
        ]
    },
    {
        "name": "AI & Machine Learning Hub",
        "code": "AI-ML-HUB",
        "desc": "Nghiên cứu ứng dụng Trí Tuệ Nhân Tạo: LLMs, PyTorch, Autonomous Agents & Computer Vision",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=AIMLHub",
        "min_members": 45, "max_members": 65,
        "categories": [
            {
                "name": "🤖 AGENTS & LLMS",
                "channels": [
                    {"name": "generative-ai", "topic": "Thảo luận GPT-4o, Claude, Gemini và Llama 3"},
                    {"name": "ai-agents", "topic": "Thiết kế multi-agent systems và tool-calling"}
                ]
            },
            {
                "name": "📊 MODEL TRAINING",
                "channels": [
                    {"name": "pytorch-training", "topic": "Huấn luyện mô hình, Fine-tuning và RAG pipelines"}
                ]
            }
        ]
    },
    {
        "name": "Cyber Security & Ethical Hacking",
        "code": "CYBER-SEC",
        "desc": "Bảo mật thông tin: An toàn ứng dụng web, Reverse Engineering, Cryptography và CTF",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=CyberSec",
        "min_members": 30, "max_members": 45,
        "categories": [
            {
                "name": "🛡️ APPLICATION SECURITY",
                "channels": [
                    {"name": "web-security", "topic": "Phòng chống OWASP Top 10, JWT attacks và XSS"},
                    {"name": "ctf-challenges", "topic": "Giải đề thi Capture The Flag và chia sẻ writeups"}
                ]
            }
        ]
    },
    {
        "name": "Góc Trà Đá IT",
        "code": "TRADA-IT",
        "desc": "Nơi giải tỏa căng thẳng sau những giờ gõ code — Chém gió, meme IT và chuyện công sở",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=TraDaIT",
        "min_members": 80, "max_members": 95,
        "categories": [
            {
                "name": "☕ CHÉM GIÓ",
                "channels": [
                    {"name": "chem-gio-tong-hop", "topic": "Trò chuyện vui vẻ, không drama"},
                    {"name": "meme-cong-nghe", "topic": "Meme cười trừ khi deploy thứ 6"}
                ]
            },
            {
                "name": "🍔 ĐỜI SỐNG",
                "channels": [
                    {"name": "an-uong-ca-phe", "topic": "Rủ rê ăn trưa, cà phê sáng và giao lưu"}
                ]
            }
        ]
    },
    {
        "name": "Startup & Builders Lounge",
        "code": "STARTUP-VN",
        "desc": "Dành cho các nhà sáng lập, Indie Hackers: Phát triển sản phẩm, tìm Co-founder và MVP",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=StartupVN",
        "min_members": 30, "max_members": 48,
        "categories": [
            {
                "name": "🚀 SẢN PHẨM",
                "channels": [
                    {"name": "product-ideas", "topic": "Chia sẻ và thẩm định ý tưởng sản phẩm"},
                    {"name": "launch-feedback", "topic": "Ra mắt sản phẩm mới và lắng nghe người dùng"}
                ]
            }
        ]
    },
    {
        "name": "Mobile Craft (Flutter & Swift)",
        "code": "MOBILE-DEV",
        "desc": "Lập trình ứng dụng di động: iOS Swift, Android Kotlin, Flutter và React Native",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=MobileDev",
        "min_members": 40, "max_members": 55,
        "categories": [
            {
                "name": "📱 PLATFORMS",
                "channels": [
                    {"name": "flutter-community", "topic": "Widget tree, Riverpod và tối ưu 60fps"},
                    {"name": "ios-swift-ui", "topic": "SwiftUI, Concurrency và App Store Guidelines"}
                ]
            }
        ]
    },
    {
        "name": "Database & Systems Architecture",
        "code": "DB-ARCH",
        "desc": "Quản trị và tối ưu cơ sở dữ liệu: PostgreSQL, Redis, Elasticsearch, Partitioning và B-Tree",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=DBArch",
        "min_members": 55, "max_members": 75,
        "categories": [
            {
                "name": "🗄️ RELATIONAL & CACHE",
                "channels": [
                    {"name": "postgres-tuning", "topic": "Tối ưu Index, VACUUM, EXPLAIN ANALYZE và Trigrams"},
                    {"name": "redis-patterns", "topic": "Caching strategies, Pub/Sub và ZSET presence lease"}
                ]
            }
        ]
    },
    {
        "name": "Design & Design Systems",
        "code": "DESIGN-SYS",
        "desc": "Nơi hội tụ các Designer và Frontend Dev: UI Tokens, Figma, Micro-interactions và Accessibility",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=DesignSys",
        "min_members": 35, "max_members": 50,
        "categories": [
            {
                "name": "📐 DESIGN TOKENS",
                "channels": [
                    {"name": "design-system-spec", "topic": "Quy chuẩn khoảng cách, typographic scale và colors"},
                    {"name": "figma-tips", "topic": "Auto-layout, Components và Variables trong Figma"}
                ]
            }
        ]
    },
    {
        "name": "English for Techies",
        "code": "ENG-TECH",
        "desc": "Luyện giao tiếp tiếng Anh công nghệ, viết tài liệu kỹ thuật và phỏng vấn công ty toàn cầu",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=EngTech",
        "min_members": 70, "max_members": 88,
        "categories": [
            {
                "name": "🌍 ENGLISH PRACTICE",
                "channels": [
                    {"name": "daily-chat-english", "topic": "Chatting strictly in English every day"},
                    {"name": "tech-interview-prep", "topic": "Mock interview questions, System Design & Behavioral"}
                ]
            }
        ]
    },
    {
        "name": "Lo-Fi Beats & Chill Code",
        "code": "LOFI-CHILL",
        "desc": "Âm nhạc giúp tập trung lập trình — Chia sẻ playlist, bàn phím cơ và góc setup máy tính",
        "icon": "https://api.dicebear.com/7.x/identicon/svg?seed=LofiChill",
        "min_members": 50, "max_members": 70,
        "categories": [
            {
                "name": "🎧 ÂM NHẠC & SETUP",
                "channels": [
                    {"name": "playlist-sharing", "topic": "Chia sẻ playlist Spotify, Apple Music & YouTube"},
                    {"name": "desk-setup-battlestation", "topic": "Khoe góc làm việc, bàn phím cơ và màn hình"}
                ]
            }
        ]
    }
]

CHAT_MESSAGES_POOL = [
    "Xin chào cả nhà, chúc mọi người một ngày làm việc năng suất!",
    "SignalR WebSocket trên NomNa chạy mượt mà thực sự, độ trễ chưa tới 10ms 🚀",
    "Có ai đang test thử tính năng WebRTC 1v1 call không? Gọi nét căng luôn nha.",
    "Mọi người nhớ dùng AsNoTracking() cho các query đọc để tiết kiệm RAM nhé.",
    "Vừa tối ưu xong index B-Tree, query giảm từ 400ms xuống còn 3ms, phê thật!",
    "Bản cập nhật mới hỗ trợ cả chế độ Invisible mode, đúng chuẩn Discord.",
    "Chiều nay 3h có buổi chia sẻ về Clean Architecture và CQRS nhé mọi người.",
    "Anh em cho mình hỏi cách config Redis Backplane cho SignalR với ạ.",
    "K6 benchmark vừa test qua 500 CCU, P95 ổn định dưới 50ms rồi.",
    "Bật mí là mật khẩu của tất cả tài khoản test đều là 123456 nha các bạn 😄",
    "Cà phê sáng thôi các dev ơi ☕",
    "Tuyệt vời luôn bạn ơi! Đúng cái mình đang tìm kiếm.",
    "Review giúp mình pull request này với, cảm ơn team nhiều!",
    "Đồng ý với kiến trúc này, phân tách rõ ràng Domain và Application.",
    "Giao diện trắng cam ấm áp của NomNa nhìn lâu không bị mỏi mắt, rất ưng ý."
]

def generate_users():
    users = []
    # 1. Existing users to keep consistent
    existing_users = [
        {"username": "alexrivers", "email": "alex@nomna.local", "name": "Alex Rivers", "pref": 0, "bio": "Tech Lead & System Architect"},
        {"username": "minhdev", "email": "minh@nomna.local", "name": "Minh Dev", "pref": 0, "bio": "Senior .NET & Distributed Systems Engineer"},
        {"username": "vannguyen", "email": "van@nomna.local", "name": "Van Nguyen", "pref": 0, "bio": "Fullstack Engineer & Cloud Specialist"},
        {"username": "shizuka", "email": "shizuka@gmail.com", "name": "Shizuka", "pref": 1, "bio": "UI/UX Designer & Frontend Advocate"},
        {"username": "kushina", "email": "kushina@gmail.com", "name": "Kushina Uzumaki", "pref": 2, "bio": "Security Researcher & CTF Player"},
        {"username": "lanhuong", "email": "lanhuong@nomna.local", "name": "Lan Hương", "pref": 0, "bio": "QA Lead & Automation Specialist"},
        {"username": "obito", "email": "obito@gmail.com", "name": "Obito HiHi", "pref": 3, "bio": "AI Engineer & Machine Learning Builder"}
    ]
    
    used_usernames = set()
    used_emails = set()

    for u in existing_users:
        users.append({
            "id": None, # Will lookup or keep existing ID
            "username": u["username"],
            "email": u["email"],
            "name": u["name"],
            "pref": u["pref"],
            "bio": u["bio"],
            "is_existing": True
        })
        used_usernames.add(u["username"].lower())
        used_emails.add(u["email"].lower())

    # 2. Generate 100+ new unique developers
    random.seed(42) # Reproducible seed
    target_new_count = 110
    created = 0

    while created < target_new_count:
        is_vn = random.random() < 0.75
        if is_vn:
            fn = random.choice(FIRST_NAMES_VN)
            mn = random.choice(MID_NAMES_VN)
            ln = random.choice(LAST_NAMES_VN)
            display_name = f"{ln} {mn} {fn}"
            # Normalize to ascii username
            import unicodedata
            clean_fn = unicodedata.normalize('NFKD', fn).encode('ASCII', 'ignore').decode('ASCII').lower()
            clean_ln = unicodedata.normalize('NFKD', ln).encode('ASCII', 'ignore').decode('ASCII').lower()
            tag = random.randint(10, 999)
            uname = f"{clean_fn}_{clean_ln}{tag}" if random.random() < 0.5 else f"{clean_fn}{clean_ln}{tag}"
        else:
            fn = random.choice(FIRST_NAMES_GLOBAL)
            ln = random.choice(LAST_NAMES_GLOBAL)
            display_name = f"{fn} {ln}"
            tag = random.randint(10, 999)
            uname = f"{fn.lower()}_{ln.lower()}{tag}" if random.random() < 0.5 else f"{fn.lower()}{tag}"

        email = f"{uname}@nomna.chat"
        if uname in used_usernames or email in used_emails:
            continue

        used_usernames.add(uname)
        used_emails.add(email)

        pref = random.choices([0, 1, 2, 3], weights=[0.55, 0.20, 0.15, 0.10])[0]
        bio = random.choice(BIOS)
        avatar = f"https://api.dicebear.com/7.x/avataaars/svg?seed={uname}"

        users.append({
            "id": uuidv7(),
            "username": uname,
            "email": email,
            "name": display_name,
            "avatar": avatar,
            "pref": pref,
            "bio": bio,
            "is_existing": False
        })
        created += 1

    return users

def escape_sql(val):
    if val is None:
        return "NULL"
    return "'" + str(val).replace("'", "''") + "'"

def main():
    print("-- ==========================================================")
    print("-- NomNa Production Mock Dataset Seeder (120 Users, 15 Servers)")
    print(f"-- Generated At: {datetime.now(timezone.utc).isoformat()}")
    print("-- Password for all users: 123456")
    print("-- ==========================================================\n")
    print("SET statement_timeout = 0;")
    print("BEGIN;\n")

    users = generate_users()

    # 1. Update existing users with PasswordHash for 123456
    print("-- 1. Update Existing Users Password to '123456'")
    print(f"""
UPDATE users 
SET "PasswordHash" = {escape_sql(DEFAULT_PASSWORD_HASH)},
    "EmailConfirmed" = TRUE
WHERE "UserName" IN ('alexrivers', 'minhdev', 'vannguyen', 'shizuka', 'kushina', 'lanhuong', 'obito');
""")

    # 2. Insert New Users
    print("-- 2. Insert 110+ New Users (Password: 123456)")
    for u in users:
        if u["is_existing"]:
            continue
        uid = u["id"]
        uname = u["username"]
        norm_uname = uname.upper()
        email = u["email"]
        norm_email = email.upper()
        dname = u["name"]
        avatar = u["avatar"]
        bio = u["bio"]
        pref = u["pref"]
        now = datetime.now(timezone.utc).isoformat()

        print(f"""INSERT INTO users ("Id", "UserName", "NormalizedUserName", "Email", "NormalizedEmail", "DisplayName", "AvatarUrl", "Bio", "StatusPreference", "EmailConfirmed", "PasswordHash", "SecurityStamp", "ConcurrencyStamp", "CreatedAt", "AccessFailedCount", "LockoutEnabled", "PhoneNumberConfirmed", "TwoFactorEnabled")
VALUES ('{uid}', {escape_sql(uname)}, {escape_sql(norm_uname)}, {escape_sql(email)}, {escape_sql(norm_email)}, {escape_sql(dname)}, {escape_sql(avatar)}, {escape_sql(bio)}, {pref}, TRUE, {escape_sql(DEFAULT_PASSWORD_HASH)}, '{uuid.uuid4()}', '{uuid.uuid4()}', '{now}', 0, TRUE, FALSE, FALSE)
ON CONFLICT ("NormalizedUserName") DO NOTHING;""")

    # Create temporary table or query in SQL to fetch all user IDs
    print("""
-- 3. Create Temporary Mapping of All Available Users
CREATE TEMP TABLE temp_seed_users AS 
SELECT "Id", "UserName", "DisplayName" FROM users;
""")

    # 3. Create 15 Servers
    print("-- 4. Create 15 High-Quality Servers")
    for s_idx, spec in enumerate(SERVER_SPECS):
        s_id = uuidv7()
        s_name = spec["name"]
        s_code = spec["code"]
        s_desc = spec["desc"]
        s_icon = spec["icon"]
        now = (datetime.now(timezone.utc) - timedelta(days=random.randint(5, 30))).isoformat()

        # Pick owner from popular users
        owner_usernames = ['alexrivers', 'minhdev', 'vannguyen', 'lanhuong', 'shizuka', 'kushina', 'obito']
        target_owner = owner_usernames[s_idx % len(owner_usernames)]

        print(f"""
DO $$
DECLARE
    v_owner_id uuid;
    v_server_id uuid := '{s_id}';
    v_everyone_role_id uuid := '{uuidv7()}';
    v_admin_role_id uuid := '{uuidv7()}';
    v_mod_role_id uuid := '{uuidv7()}';
    v_vip_role_id uuid := '{uuidv7()}';
    v_owner_member_id uuid;
    v_cat_id uuid;
    v_chan_id uuid;
    v_member_rec RECORD;
    v_target_member_count int := {random.randint(spec['min_members'], spec['max_members'])};
    v_sm_id uuid;
BEGIN
    SELECT "Id" INTO v_owner_id FROM temp_seed_users WHERE "UserName" = '{target_owner}' LIMIT 1;
    IF v_owner_id IS NULL THEN
        SELECT "Id" INTO v_owner_id FROM temp_seed_users LIMIT 1;
    END IF;

    -- Insert Server
    INSERT INTO servers ("Id", "Name", "Description", "IconUrl", "InviteCode", "OwnerId", "CreatedAt")
    VALUES (v_server_id, {escape_sql(s_name)}, {escape_sql(s_desc)}, {escape_sql(s_icon)}, '{s_code}', v_owner_id, '{now}')
    ON CONFLICT ("Id") DO NOTHING;

    -- Insert Server Roles
    INSERT INTO server_roles ("Id", "ServerId", "Name", "Permissions", "Position", "ColorHex", "IsHoisted", "IsMentionable", "IsDefault", "CreatedAt")
    VALUES 
        (v_everyone_role_id, v_server_id, '@everyone', {PERMS_DEFAULT}, 0, NULL, FALSE, FALSE, TRUE, '{now}'),
        (v_admin_role_id, v_server_id, 'Admin', {PERMS_ADMIN}, 3, '#EF4444', TRUE, TRUE, FALSE, '{now}'),
        (v_mod_role_id, v_server_id, 'Moderator', {PERMS_MOD}, 2, '#3B82F6', TRUE, TRUE, FALSE, '{now}'),
        (v_vip_role_id, v_server_id, 'VIP Member', {PERMS_VIP}, 1, '#10B981', TRUE, FALSE, FALSE, '{now}')
    ON CONFLICT ("Id") DO NOTHING;

    -- Add Owner as Server Member
    v_owner_member_id := '{uuidv7()}';
    INSERT INTO server_members ("Id", "ServerId", "UserId", "Role", "CreatedAt")
    VALUES (v_owner_member_id, v_server_id, v_owner_id, 2, '{now}')
    ON CONFLICT ("ServerId", "UserId") DO NOTHING;

    INSERT INTO member_roles ("Id", "ServerMemberId", "RoleId", "AssignedAt", "CreatedAt")
    VALUES ('{uuidv7()}', v_owner_member_id, v_admin_role_id, '{now}', '{now}')
    ON CONFLICT ("ServerMemberId", "RoleId") DO NOTHING;
""")

        # Add random members to reach target_member_count (20 to 95)
        print(f"""
    -- Populate Server Members ({spec['min_members']} - {spec['max_members']} members)
    FOR v_member_rec IN (
        SELECT "Id" FROM temp_seed_users 
        WHERE "Id" != v_owner_id 
        ORDER BY RANDOM() 
        LIMIT v_target_member_count
    ) LOOP
        v_sm_id := gen_random_uuid();
        INSERT INTO server_members ("Id", "ServerId", "UserId", "Role", "CreatedAt")
        VALUES (v_sm_id, v_server_id, v_member_rec."Id", 0, '{now}')
        ON CONFLICT ("ServerId", "UserId") DO NOTHING;
        
        -- Give 10% of members VIP role
        IF random() < 0.12 THEN
            INSERT INTO member_roles ("Id", "ServerMemberId", "RoleId", "AssignedAt", "CreatedAt")
            VALUES (gen_random_uuid(), v_sm_id, v_vip_role_id, '{now}', '{now}')
            ON CONFLICT ("ServerMemberId", "RoleId") DO NOTHING;
        END IF;
    END LOOP;
""")

        # Add Categories and Channels
        pos = 0
        for cat in spec["categories"]:
            cat_id = uuidv7()
            cat_name = cat["name"]
            print(f"""
    -- Category: {cat_name}
    v_cat_id := '{cat_id}';
    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "IsPrivate", "CreatedById", "Position", "CreatedAt")
    VALUES (v_cat_id, v_server_id, {escape_sql(cat_name)}, 3, FALSE, v_owner_id, {pos}, '{now}')
    ON CONFLICT ("Id") DO NOTHING;
""")
            pos += 1
            for chan in cat["channels"]:
                chan_id = uuidv7()
                chan_name = chan["name"]
                chan_type = chan.get("type", 0) # 0 = text, 1 = voice
                chan_topic = chan.get("topic", "")

                print(f"""
    -- Channel: #{chan_name}
    v_chan_id := '{chan_id}';
    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "IsPrivate", "CreatedById", "CategoryId", "Position", "Topic", "CreatedAt")
    VALUES (v_chan_id, v_server_id, {escape_sql(chan_name)}, {chan_type}, FALSE, v_owner_id, v_cat_id, {pos}, {escape_sql(chan_topic)}, '{now}')
    ON CONFLICT ("Id") DO NOTHING;

    -- Register all server members into channel_members for instant read tracking
    INSERT INTO channel_members ("Id", "ChannelId", "UserId", "LastReadAt", "CreatedAt")
    SELECT gen_random_uuid(), v_chan_id, sm."UserId", NOW() - (random() * interval '3 days'), '{now}'
    FROM server_members sm
    WHERE sm."ServerId" = v_server_id
    ON CONFLICT ("ChannelId", "UserId") DO NOTHING;
""")
                pos += 1

                # If text channel, insert 3-6 seed messages
                if chan_type == 0:
                    for _ in range(random.randint(3, 6)):
                        msg_id = uuidv7()
                        msg_content = random.choice(CHAT_MESSAGES_POOL)
                        msg_time = (datetime.now(timezone.utc) - timedelta(hours=random.randint(1, 72))).isoformat()
                        print(f"""
    -- Message in #{chan_name}
    INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "IsEdited", "Attachments", "CreatedAt")
    SELECT '{msg_id}', v_chan_id, sm."UserId", {escape_sql(msg_content)}, FALSE, '[]'::jsonb, '{msg_time}'
    FROM server_members sm
    WHERE sm."ServerId" = v_server_id
    ORDER BY RANDOM() LIMIT 1
    ON CONFLICT ("Id") DO NOTHING;
""")

        print("END $$;\n")

    # 4. Create Rich Friendships and DM Channels
    print("-- 5. Create Rich Friendships & DM Channels")
    print("""
DO $$
DECLARE
    v_alex_id uuid;
    v_minh_id uuid;
    v_van_id uuid;
    v_shizuka_id uuid;
    v_kushina_id uuid;
    v_lanhuong_id uuid;
    v_obito_id uuid;
    v_other_rec RECORD;
    v_dm_chan_id uuid;
BEGIN
    SELECT "Id" INTO v_alex_id FROM temp_seed_users WHERE "UserName" = 'alexrivers' LIMIT 1;
    SELECT "Id" INTO v_minh_id FROM temp_seed_users WHERE "UserName" = 'minhdev' LIMIT 1;
    SELECT "Id" INTO v_van_id FROM temp_seed_users WHERE "UserName" = 'vannguyen' LIMIT 1;
    SELECT "Id" INTO v_shizuka_id FROM temp_seed_users WHERE "UserName" = 'shizuka' LIMIT 1;
    SELECT "Id" INTO v_kushina_id FROM temp_seed_users WHERE "UserName" = 'kushina' LIMIT 1;
    SELECT "Id" INTO v_lanhuong_id FROM temp_seed_users WHERE "UserName" = 'lanhuong' LIMIT 1;
    SELECT "Id" INTO v_obito_id FROM temp_seed_users WHERE "UserName" = 'obito' LIMIT 1;

    -- Core Friends (Mutual Accepted)
    INSERT INTO friendships ("Id", "RequesterId", "AddresseeId", "Status", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_alex_id, v_minh_id, 1, NOW() - interval '10 days'),
        (gen_random_uuid(), v_alex_id, v_van_id, 1, NOW() - interval '9 days'),
        (gen_random_uuid(), v_alex_id, v_shizuka_id, 1, NOW() - interval '8 days'),
        (gen_random_uuid(), v_minh_id, v_van_id, 1, NOW() - interval '7 days'),
        (gen_random_uuid(), v_minh_id, v_lanhuong_id, 1, NOW() - interval '6 days'),
        (gen_random_uuid(), v_van_id, v_kushina_id, 1, NOW() - interval '5 days'),
        (gen_random_uuid(), v_shizuka_id, v_kushina_id, 1, NOW() - interval '4 days'),
        (gen_random_uuid(), v_lanhuong_id, v_obito_id, 1, NOW() - interval '3 days')
    ON CONFLICT ("RequesterId", "AddresseeId") DO NOTHING;

    -- Pending Requests (For testing incoming/outgoing friend request tabs)
    INSERT INTO friendships ("Id", "RequesterId", "AddresseeId", "Status", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_obito_id, v_alex_id, 0, NOW() - interval '1 hour'),
        (gen_random_uuid(), v_alex_id, v_lanhuong_id, 0, NOW() - interval '2 hours')
    ON CONFLICT ("RequesterId", "AddresseeId") DO NOTHING;

    -- Blocked Friendship (For testing Blocked tab & blocked call guard)
    INSERT INTO friendships ("Id", "RequesterId", "AddresseeId", "Status", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_alex_id, v_kushina_id, 2, NOW() - interval '15 days')
    ON CONFLICT ("RequesterId", "AddresseeId") DO NOTHING;

    -- Create 40+ Random Friendships among other users
    FOR v_other_rec IN (
        SELECT u1."Id" AS id1, u2."Id" AS id2 
        FROM temp_seed_users u1 
        CROSS JOIN temp_seed_users u2 
        WHERE u1."Id" < u2."Id" 
        ORDER BY RANDOM() 
        LIMIT 65
    ) LOOP
        INSERT INTO friendships ("Id", "RequesterId", "AddresseeId", "Status", "CreatedAt")
        VALUES (gen_random_uuid(), v_other_rec.id1, v_other_rec.id2, 1, NOW() - (random() * interval '20 days'))
        ON CONFLICT ("RequesterId", "AddresseeId") DO NOTHING;
    END LOOP;

    -- Seed 1-1 Direct Message Channel between Alex & Minh
    v_dm_chan_id := gen_random_uuid();
    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "IsPrivate", "CreatedById", "CreatedAt", "LastMessageAt", "LastMessageContent", "LastMessageSenderId")
    VALUES (v_dm_chan_id, NULL, 'dm-alex-minh', 2, TRUE, v_alex_id, NOW() - interval '2 days', NOW() - interval '15 minutes', 'Tối nay test thử WebRTC gọi video nha!', v_minh_id)
    ON CONFLICT ("Id") DO NOTHING;

    INSERT INTO channel_members ("Id", "ChannelId", "UserId", "LastReadAt", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_dm_chan_id, v_alex_id, NOW() - interval '1 hour', NOW() - interval '2 days'),
        (gen_random_uuid(), v_dm_chan_id, v_minh_id, NOW(), NOW() - interval '2 days')
    ON CONFLICT ("ChannelId", "UserId") DO NOTHING;

    INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "IsEdited", "Attachments", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_dm_chan_id, v_alex_id, 'Chào Minh, backend SignalR với Redis Backplane test ngon lành rồi nhé!', FALSE, '[]'::jsonb, NOW() - interval '30 minutes'),
        (gen_random_uuid(), v_dm_chan_id, v_minh_id, 'Tối nay test thử WebRTC gọi video nha!', FALSE, '[]'::jsonb, NOW() - interval '15 minutes')
    ON CONFLICT ("Id") DO NOTHING;

    -- Seed 1-1 Direct Message Channel between Alex & Van
    v_dm_chan_id := gen_random_uuid();
    INSERT INTO channels ("Id", "ServerId", "Name", "Type", "IsPrivate", "CreatedById", "CreatedAt", "LastMessageAt", "LastMessageContent", "LastMessageSenderId")
    VALUES (v_dm_chan_id, NULL, 'dm-alex-van', 2, TRUE, v_alex_id, NOW() - interval '1 day', NOW() - interval '1 hour', 'Đã merge xong các component UI rồi anh nhé.', v_van_id)
    ON CONFLICT ("Id") DO NOTHING;

    INSERT INTO channel_members ("Id", "ChannelId", "UserId", "LastReadAt", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_dm_chan_id, v_alex_id, NOW(), NOW() - interval '1 day'),
        (gen_random_uuid(), v_dm_chan_id, v_van_id, NOW(), NOW() - interval '1 day')
    ON CONFLICT ("ChannelId", "UserId") DO NOTHING;

    INSERT INTO messages ("Id", "ChannelId", "SenderId", "Content", "IsEdited", "Attachments", "CreatedAt")
    VALUES 
        (gen_random_uuid(), v_dm_chan_id, v_van_id, 'Đã merge xong các component UI rồi anh nhé.', FALSE, '[]'::jsonb, NOW() - interval '1 hour')
    ON CONFLICT ("Id") DO NOTHING;

END $$;
""")

    print("DROP TABLE IF EXISTS temp_seed_users;")
    print("COMMIT;")
    print("\n-- Seeding script finished successfully.")

if __name__ == "__main__":
    main()
