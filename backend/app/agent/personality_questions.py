"""本地人格测试题库：60 道中文题目，覆盖 EI / SN / TF / JP / AT 五个维度。"""

# 每题格式: { question, dimension, options: [left, right] }
# dimension: "EI"=外向/内向, "SN"=实感/直觉, "TF"=思考/情感, "JP"=判断/感知, "AT"=坚定/起伏
# 正向分值(>0)偏向右侧，负向分值(<0)偏向左侧

QUESTIONS = [
    # ── EI：外向 Extraversion vs 内向 Introversion（12 题）──
    {"question": "社交活动后，你通常感觉：", "dimension": "EI",
     "options": ["精力充沛，还想继续", "需要独处来恢复能量"]},
    {"question": "在聚会中，你更倾向于：", "dimension": "EI",
     "options": ["主动认识新朋友", "和熟悉的人待在一起"]},
    {"question": "你更喜欢的工作方式是：", "dimension": "EI",
     "options": ["团队协作、头脑风暴", "独立思考和深度工作"]},
    {"question": "周末你更想怎么过？", "dimension": "EI",
     "options": ["约朋友出去聚会", "在家享受一个人的时光"]},
    {"question": "在人群中，你通常：", "dimension": "EI",
     "options": ["感到兴奋和有活力", "感到消耗和疲惫"]},
    {"question": "你更喜欢哪种沟通方式？", "dimension": "EI",
     "options": ["当面聊或打电话", "文字消息或邮件"]},
    {"question": "结识新朋友对你来说：", "dimension": "EI",
     "options": ["轻松愉快", "需要鼓起勇气"]},
    {"question": "需要做重要决定时，你会：", "dimension": "EI",
     "options": ["找朋友讨论，听听多方意见", "自己深入思考后再做决定"]},
    {"question": "在会议中，你更倾向于：", "dimension": "EI",
     "options": ["积极发言，想到什么说什么", "倾听观察，想好再说"]},
    {"question": "你觉得自己更像：", "dimension": "EI",
     "options": ["话多外向的人", "安静内向的人"]},
    {"question": "面对一个需要求助的问题，你会：", "dimension": "EI",
     "options": ["直接开口求助", "先自己研究，尽量不麻烦别人"]},
    {"question": "你对小型闲聊的态度是：", "dimension": "EI",
     "options": ["觉得很自然，可以聊很多", "觉得不太自在，更想聊有深度的话题"]},

    # ── SN：实感 Sensing vs 直觉 Intuition（12 题）──
    {"question": "学习新技能时，你更倾向于：", "dimension": "SN",
     "options": ["跟着教程一步步实操", "先理解整体概念和原理"]},
    {"question": "你更相信：", "dimension": "SN",
     "options": ["亲身经历和实际数据", "直觉和灵感"]},
    {"question": "规划旅行时，你更注重：", "dimension": "SN",
     "options": ["具体的行程安排和实用信息", "旅行的氛围感和可能性"]},
    {"question": "你更欣赏哪种人？", "dimension": "SN",
     "options": ["脚踏实地、注重细节的人", "天马行空、有想象力的人"]},
    {"question": "读一本书时，你更喜欢：", "dimension": "SN",
     "options": ["情节扎实、描写细腻的作品", "充满隐喻和想象空间的作品"]},
    {"question": "解决问题时，你通常：", "dimension": "SN",
     "options": ["借鉴已有的成功经验", "尝试创新的解决方案"]},
    {"question": "你更关注：", "dimension": "SN",
     "options": ["眼前的现实和具体细节", "未来的可能性和整体趋势"]},
    {"question": "描述一件事时，你倾向于：", "dimension": "SN",
     "options": ["按时间顺序，陈述具体事实", "跳跃式地表达核心观点和联想"]},
    {"question": "对于新想法，你的第一反应是：", "dimension": "SN",
     "options": ["这可行吗？怎么落地？", "这很有趣！能带来什么改变？"]},
    {"question": "做菜时你更像：", "dimension": "SN",
     "options": ["严格按菜谱来做", "凭感觉自由发挥"]},
    {"question": "你买衣服时更看重：", "dimension": "SN",
     "options": ["面料、做工、实穿性", "设计感、风格、独特感"]},
    {"question": "听到一个新概念，你会：", "dimension": "SN",
     "options": ["想了解具体案例和应用场景", "被概念本身的可能性吸引"]},

    # ── TF：思考 Thinking vs 情感 Feeling（12 题）──
    {"question": "做决定时，你更依赖：", "dimension": "TF",
     "options": ["逻辑分析和客观利弊", "价值观和对他人的影响"]},
    {"question": "同事心情不好影响工作，你会：", "dimension": "TF",
     "options": ["指出问题，帮助改进效率", "先关心情绪，理解发生了什么"]},
    {"question": "你认为更重要的是：", "dimension": "TF",
     "options": ["公平和一致性", "同理心和人情味"]},
    {"question": "面对批评，你更希望对方：", "dimension": "TF",
     "options": ["直接指出问题所在", "先肯定再温和地提出建议"]},
    {"question": "在争论中你更倾向于：", "dimension": "TF",
     "options": ["坚持事实和逻辑", "维护和谐和关系"]},
    {"question": "你更欣赏哪种领导风格？", "dimension": "TF",
     "options": ["目标明确、赏罚分明的", "关心员工、有温度的"]},
    {"question": "朋友向你倾诉烦恼，你通常会：", "dimension": "TF",
     "options": ["帮忙分析问题，给出解决建议", "表示理解，陪着一起感受"]},
    {"question": "选电影时你更倾向于：", "dimension": "TF",
     "options": ["逻辑严密的悬疑/科幻片", "感人至深的剧情/爱情片"]},
    {"question": "小组作业有人没完成任务，你会：", "dimension": "TF",
     "options": ["按规则记录，让老师知道真实情况", "私下沟通，给一次补救机会"]},
    {"question": "你更认同哪句话？", "dimension": "TF",
     "options": ["对事不对人", "做事先做人"]},
    {"question": "评价一个设计时，你首先看：", "dimension": "TF",
     "options": ["功能是否合理、结构是否清晰", "是否有美感、是否能打动人"]},
    {"question": "在重大人生选择上，你会：", "dimension": "TF",
     "options": ["列一个利弊清单，理性分析", "跟随内心的感受，做让自己开心的事"]},

    # ── JP：判断 Judging vs 感知 Perceiving（12 题）──
    {"question": "对于日程安排，你更喜欢：", "dimension": "JP",
     "options": ["提前规划，按计划执行", "灵活应对，随性而为"]},
    {"question": "面对一个新任务，你通常：", "dimension": "JP",
     "options": ["尽早开始，按部就班完成", "在截止日期前集中冲刺"]},
    {"question": "你的桌面或房间通常是：", "dimension": "JP",
     "options": ["整洁有序，每样东西有固定位置", "看起来有点乱，但我知道东西在哪儿"]},
    {"question": "你更享受：", "dimension": "JP",
     "options": ["事情做完、清单清空的满足感", "保持开放、随时探索新可能的自由感"]},
    {"question": "做决定时你更倾向于：", "dimension": "JP",
     "options": ["尽早确定，不喜欢悬而未决", "保留弹性，可以随时调整"]},
    {"question": "旅行时你更喜欢：", "dimension": "JP",
     "options": ["有详细行程，每天安排妥当", "到了再说，随心所欲地探索"]},
    {"question": "面对多项任务，你会：", "dimension": "JP",
     "options": ["列出优先级，逐一完成", "同时推进，看心情切换"]},
    {"question": "你更符合哪种描述？", "dimension": "JP",
     "options": ["喜欢规则和确定性", "喜欢自由和可能性"]},
    {"question": "购物时你倾向于：", "dimension": "JP",
     "options": ["列好清单，快速精准买完", "逛逛看看，可能会发现意外惊喜"]},
    {"question": "你更喜欢哪种工作环境？", "dimension": "JP",
     "options": ["流程清晰、有明确截止日期", "灵活自由、可以自主安排节奏"]},
    {"question": "朋友临时约你今晚出去，你通常：", "dimension": "JP",
     "options": ["不太喜欢被打乱计划，需要提前通知", "欣然接受，即兴安排也很有趣"]},
    {"question": "写完一篇文章或方案，你更可能：", "dimension": "JP",
     "options": ["反复修改完善直到满意", "差不多就交了，后面再说"]},

    # ── AT：坚定 Assertive vs 起伏 Turbulent（12 题）──
    {"question": "面对重要面试或演讲，你通常：", "dimension": "AT",
     "options": ["保持冷静和自信", "感到紧张和压力"]},
    {"question": "做完一件事后，你更倾向于：", "dimension": "AT",
     "options": ["对自己的表现总体满意", "担心可以做得更好"]},
    {"question": "面对批评，你的反应是：", "dimension": "AT",
     "options": ["客观看待，不往心里去", "容易自我怀疑，反复琢磨"]},
    {"question": "你对自己的要求是：", "dimension": "AT",
     "options": ["尽力就好，不苛求完美", "经常觉得自己还不够好"]},
    {"question": "遇到挫折时你会：", "dimension": "AT",
     "options": ["很快调整心态，继续前进", "深受打击，需要较长时间恢复"]},
    {"question": "你更符合哪种状态？", "dimension": "AT",
     "options": ["情绪稳定，不容易大起大落", "情绪波动较大，容易被影响"]},
    {"question": "睡前你通常会：", "dimension": "AT",
     "options": ["轻松入睡，不太想白天的事", "反复回想今天做了什么、哪里可以更好"]},
    {"question": "别人对你的评价和看法：", "dimension": "AT",
     "options": ["不太影响我的自我认知", "会让我反复思考自己是不是有问题"]},
    {"question": "面对不确定的未来，你：", "dimension": "AT",
     "options": ["相信船到桥头自然直", "容易焦虑，想要掌控更多"]},
    {"question": "你觉得自己更像：", "dimension": "AT",
     "options": ["从容淡定的人", "容易紧张的人"]},
    {"question": "做决定后你会：", "dimension": "AT",
     "options": ["不纠结，相信自己的判断", "总担心是否做了错误的选择"]},
    {"question": "看到别人比你优秀时，你更可能：", "dimension": "AT",
     "options": ["欣赏和学习，不觉得被威胁", "感到压力和自我否定"]},
]

# ── 16 型人格名称映射 ──
TYPE_NAMES: dict[str, dict[str, str]] = {
    "INTJ": {"name": "建筑师", "snippet": "富有战略思维的独立思考者，追求知识与创新。"},
    "INTP": {"name": "逻辑学家", "snippet": "创新的问题解决者，对知识和理论充满无尽好奇。"},
    "ENTJ": {"name": "指挥官", "snippet": "天生的领导者，善于制定计划并推动实施。"},
    "ENTP": {"name": "辩论家", "snippet": "好奇而机敏的思想者，享受智力上的挑战和辩论。"},
    "INFJ": {"name": "提倡者", "snippet": "安静而富有洞察力的理想主义者，致力于帮助他人。"},
    "INFP": {"name": "调停者", "snippet": "富有创意和同理心的理想主义者，重视内在和谐。"},
    "ENFJ": {"name": "主人公", "snippet": "天生的导师，善于激发他人的潜力并建立深厚连接。"},
    "ENFP": {"name": "竞选者", "snippet": "热情而有创造力的人，善于发现事物之间的联结。"},
    "ISTJ": {"name": "物流师", "snippet": "可靠而务实的执行者，重视秩序和稳定。"},
    "ISFJ": {"name": "守卫者", "snippet": "温暖而细心的守护者，善于照顾身边的人。"},
    "ESTJ": {"name": "总经理", "snippet": "出色的组织者，追求效率和秩序。"},
    "ESFJ": {"name": "执政官", "snippet": "热心而健谈的照顾者，重视和谐与社区。"},
    "ISTP": {"name": "鉴赏家", "snippet": "灵活而务实的问题解决者，善于动手操作。"},
    "ISFP": {"name": "探险家", "snippet": "安静而富有审美的艺术家，享受当下的美好。"},
    "ESTP": {"name": "企业家", "snippet": "精力充沛的冒险者，善于快速反应和适应变化。"},
    "ESFP": {"name": "表演者", "snippet": "活泼而有魅力的表演者，享受生活的每个瞬间。"},
}

# ── 各维度的 trait info ──
DIMENSION_META = {
    "EI": {
        "label": "精力来源",
        "left": "内向 (Introverted)",
        "right": "外向 (Extraverted)",
        "left_desc": "倾向于独处和小圈子社交，在安静环境中恢复能量。",
        "right_desc": "倾向于广泛社交和群体活动，在与人互动中获取能量。",
    },
    "SN": {
        "label": "信息获取",
        "left": "实感 (Observant)",
        "right": "直觉 (Intuitive)",
        "left_desc": "注重具体事实和实践经验，相信亲眼所见。",
        "right_desc": "注重大局和抽象概念，喜欢探索可能性和未来。",
    },
    "TF": {
        "label": "决策方式",
        "left": "思考 (Thinking)",
        "right": "情感 (Feeling)",
        "left_desc": "以逻辑和客观标准做决策，重视公平和一致性。",
        "right_desc": "以价值观和人际影响做决策，重视同理心和和谐。",
    },
    "JP": {
        "label": "生活方式",
        "left": "判断 (Judging)",
        "right": "感知 (Perceiving)",
        "left_desc": "喜欢规划和确定性，享受有条不紊地完成任务。",
        "right_desc": "喜欢灵活和自发性，享受开放式的探索过程。",
    },
    "AT": {
        "label": "自我认同",
        "left": "起伏 (Turbulent)",
        "right": "坚定 (Assertive)",
        "left_desc": "对自我要求较高，容易感受压力和自我怀疑。",
        "right_desc": "情绪稳定自信，较少受外界影响。",
    },
}


def score_personality(answers: dict[str, int]) -> dict:
    """
    根据答案计算人格类型。
    answers: {question_id: value}  value 为 -3 到 +3
    返回与外部 API 兼容的结果格式：
    {
      "niceName": "建筑师",
      "fullCode": "INTJ-A",
      "snippet": "...",
      "traits": [...]
    }
    """
    # 按维度汇总
    dim_scores: dict[str, int] = {"EI": 0, "SN": 0, "TF": 0, "JP": 0, "AT": 0}
    dim_questions: dict[str, int] = {"EI": 0, "SN": 0, "TF": 0, "JP": 0, "AT": 0}

    for q in QUESTIONS:
        dim = q["dimension"]
        vid = q.get("id") or q["options"][0]  # 兼容旧版用 id 的调用
        # 尝试用 options[0] 匹配，也尝试用 question 匹配
        val = answers.get(q["question"])
        if val is None:
            # 也尝试用 index 匹配
            for k, v in answers.items():
                if k == q["question"] or k == str(QUESTIONS.index(q)):
                    val = v
                    break
        if val is not None:
            dim_scores[dim] += val
            dim_questions[dim] += 1

    def _calc_pct(score: int, n_questions: int) -> tuple[int, bool]:
        """返回 (百分比, 是否偏右侧)。"""
        max_abs = n_questions * 3
        if max_abs == 0:
            return 50, True
        # 映射：-max_abs → 0%, 0 → 50%, +max_abs → 100%
        pct = int(50 + (score / max_abs) * 50)
        pct = max(0, min(100, pct))
        return pct, score > 0

    # 确定四字母类型
    e_i_pct, is_e = _calc_pct(dim_scores["EI"], dim_questions["EI"])
    s_n_pct, is_n = _calc_pct(dim_scores["SN"], dim_questions["SN"])
    t_f_pct, is_f = _calc_pct(dim_scores["TF"], dim_questions["TF"])
    j_p_pct, is_p = _calc_pct(dim_scores["JP"], dim_questions["JP"])
    a_t_pct, is_a = _calc_pct(dim_scores["AT"], dim_questions["AT"])

    type_code = (
        ("E" if is_e else "I")
        + ("N" if is_n else "S")
        + ("F" if is_f else "T")
        + ("P" if is_p else "J")
    )
    identity = "A" if is_a else "T"
    full_code = f"{type_code}-{identity}"

    type_info = TYPE_NAMES.get(type_code, {"name": type_code, "snippet": "独特的你。"})

    traits = [
        {
            "key": "ei", "label": DIMENSION_META["EI"]["label"],
            "color": "blue",
            "score": e_i_pct,
            "pct": e_i_pct,
            "trait": DIMENSION_META["EI"]["right"] if is_e else DIMENSION_META["EI"]["left"],
            "description": DIMENSION_META["EI"]["right_desc"] if is_e else DIMENSION_META["EI"]["left_desc"],
            "snippet": f"你{'更偏向' if e_i_pct > 55 else '略微偏向'}{'外向' if is_e else '内向'}。",
        },
        {
            "key": "sn", "label": DIMENSION_META["SN"]["label"],
            "color": "green",
            "score": s_n_pct,
            "pct": s_n_pct,
            "trait": DIMENSION_META["SN"]["right"] if is_n else DIMENSION_META["SN"]["left"],
            "description": DIMENSION_META["SN"]["right_desc"] if is_n else DIMENSION_META["SN"]["left_desc"],
            "snippet": f"你{'更偏向' if s_n_pct > 55 else '略微偏向'}{'直觉型' if is_n else '实感型'}思维。",
        },
        {
            "key": "tf", "label": DIMENSION_META["TF"]["label"],
            "color": "yellow",
            "score": t_f_pct,
            "pct": t_f_pct,
            "trait": DIMENSION_META["TF"]["right"] if is_f else DIMENSION_META["TF"]["left"],
            "description": DIMENSION_META["TF"]["right_desc"] if is_f else DIMENSION_META["TF"]["left_desc"],
            "snippet": f"你做决定时更依赖{'情感和价值判断' if is_f else '逻辑和客观分析'}。",
        },
        {
            "key": "jp", "label": DIMENSION_META["JP"]["label"],
            "color": "orange",
            "score": j_p_pct,
            "pct": j_p_pct,
            "trait": DIMENSION_META["JP"]["right"] if is_p else DIMENSION_META["JP"]["left"],
            "description": DIMENSION_META["JP"]["right_desc"] if is_p else DIMENSION_META["JP"]["left_desc"],
            "snippet": f"你更喜欢{'灵活随性' if is_p else '有条不紊'}的生活方式。",
        },
        {
            "key": "at", "label": DIMENSION_META["AT"]["label"],
            "color": "red",
            "score": a_t_pct,
            "pct": a_t_pct,
            "trait": DIMENSION_META["AT"]["right"] if is_a else DIMENSION_META["AT"]["left"],
            "description": DIMENSION_META["AT"]["right_desc"] if is_a else DIMENSION_META["AT"]["left_desc"],
            "snippet": f"你在压力下{'保持从容' if is_a else '容易焦虑'}。",
        },
    ]

    return {
        "niceName": type_info["name"],
        "fullCode": full_code,
        "snippet": type_info["snippet"],
        "traits": traits,
    }
