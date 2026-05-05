import unittest

from app.services.mental_health.context_builder import (
    build_ai_context,
    get_resource_topics,
    infer_ui_mode_from_age,
)


class MentalHealthContextTests(unittest.TestCase):
    def test_senior_context_includes_questions_answers_and_card_voice_rules(self):
        prompt = build_ai_context(
            user_mode="senior",
            interaction_kind="daily_summary",
            questions_answers=[
                {
                    "question_id": "sleep",
                    "question_text": "昨晚睡得怎么样？",
                    "answer_text": "没睡好，今天很累，眼睛也疼",
                },
                {
                    "question_id": "support_need",
                    "question_text": "今天想要什么支持？",
                    "answer_text": "想有人陪我聊聊天",
                },
            ],
        )

        self.assertIn("这是 NeuraSense 陪伴版中老年用户完成的语音/文字问候", prompt)
        self.assertIn("昨晚睡得怎么样？", prompt)
        self.assertIn("没睡好，今天很累，眼睛也疼", prompt)
        self.assertIn("今天想要什么支持？", prompt)
        self.assertIn("想有人陪我聊聊天", prompt)
        self.assertIn("项目内置心理健康资料", prompt)
        self.assertIn("NIMH", prompt)
        self.assertIn("WHO", prompt)
        self.assertIn("SAMHSA", prompt)
        self.assertIn("适合朗读", prompt)
        self.assertIn("一次只呈现一个小卡片", prompt)
        self.assertIn("每条建议必须有具体动作、时长或对象", prompt)
        self.assertIn("不要把用户的话原样复述成总结", prompt)
        self.assertIn("睡眠", prompt)
        self.assertIn("社会连接", prompt)
        self.assertIn("危机", prompt)

    def test_full_context_uses_standard_chat_framing_without_senior_cards(self):
        prompt = build_ai_context(
            user_mode="standard",
            interaction_kind="chat",
            user_message="我最近考试压力很大，晚上睡不着。",
            recent_context={"bio_signals": {"stress": 0.78}},
        )

        self.assertIn("这是 NeuraSense 完整功能中的心理健康对话", prompt)
        self.assertIn("我最近考试压力很大，晚上睡不着。", prompt)
        self.assertIn("结合用户当前消息、历史对话和可用状态线索", prompt)
        self.assertIn("适合年轻/普通用户", prompt)
        self.assertNotIn("一次只呈现一个小卡片", prompt)

    def test_resource_topics_cover_broad_project_needs(self):
        topics = set(get_resource_topics())

        self.assertTrue(
            {
                "sleep",
                "stress_breathing",
                "social_connection",
                "older_adult_loneliness",
                "crisis_safety",
                "body_discomfort",
                "young_pressure",
            }.issubset(topics)
        )

    def test_age_based_ui_mode_threshold(self):
        self.assertEqual(infer_ui_mode_from_age(None), "standard")
        self.assertEqual(infer_ui_mode_from_age(59), "standard")
        self.assertEqual(infer_ui_mode_from_age(60), "senior")
        self.assertEqual(infer_ui_mode_from_age(82), "senior")

    def test_senior_summary_prompt_uses_project_context_builder(self):
        from app.schemas.senior import SeniorQuestionAnswer
        from app.services.senior.summary_service import _build_senior_summary_prompt

        prompt = _build_senior_summary_prompt(
            answers=[
                SeniorQuestionAnswer(
                    question_id="sleep",
                    question_text="昨晚睡得怎么样？",
                    answer_text="没睡好，眼睛有点痛",
                )
            ],
            checkin={"mood": "tired"},
            recent_context={"previous": "wants company"},
        )

        self.assertIn("系统问题和用户回答", prompt)
        self.assertIn("昨晚睡得怎么样？", prompt)
        self.assertIn("没睡好，眼睛有点痛", prompt)
        self.assertIn("陪伴版中老年用户", prompt)
        self.assertIn("严格 JSON", prompt)
        self.assertIn("不要写项目介绍", prompt)
        self.assertIn("plain_summary 必须遵循", prompt)

    def test_senior_summary_fallback_is_practical_for_body_discomfort(self):
        from app.schemas.senior import SeniorQuestionAnswer
        from app.services.senior.summary_service import build_fallback_summary

        summary = build_fallback_summary(
            [
                SeniorQuestionAnswer(
                    question_id="sleep",
                    question_text="昨晚睡得怎么样？",
                    answer_text="半夜醒了，没睡好",
                ),
                SeniorQuestionAnswer(
                    question_id="body",
                    question_text="今天身体怎么样？",
                    answer_text="眼睛有点痛，也很累",
                ),
                SeniorQuestionAnswer(
                    question_id="support_need",
                    question_text="今天想要什么支持？",
                    answer_text="想有人陪我聊聊天",
                ),
            ]
        )

        combined = " ".join([
            summary.summary_title,
            summary.plain_summary,
            summary.recommendation.title,
            summary.recommendation.reason,
        ])
        self.assertIn("眼睛", combined)
        self.assertIn("10 分钟", combined)
        self.assertEqual(summary.recommended_exercise.id, "eye_rest_10min")
        self.assertEqual(len(summary.insight_cards), 5)
        self.assertTrue(summary.family_message)
        self.assertNotIn("NeuraSense", combined)
        self.assertNotIn("诊断", combined)
        self.assertNotIn("评分", combined)

    def test_senior_safety_detects_urgent_and_medical_emergency(self):
        from app.services.senior.summary_service import detect_risk_level

        self.assertEqual(detect_risk_level("我不想活了，今晚想吃很多药")[0], "medical_emergency")
        self.assertEqual(detect_risk_level("我要自杀，我准备跳楼")[0], "urgent")
        self.assertEqual(detect_risk_level("胸口很痛，喘不过气")[0], "medical_emergency")
        self.assertEqual(detect_risk_level("最近撑不住，很绝望")[0], "elevated")
        self.assertEqual(detect_risk_level("睡不好，有点孤单")[0], "watch")

    def test_senior_summary_fallback_routes_crisis_to_help_cards(self):
        from app.schemas.senior import SeniorQuestionAnswer
        from app.services.senior.summary_service import build_fallback_summary

        summary = build_fallback_summary(
            [
                SeniorQuestionAnswer(
                    question_id="safety_check",
                    question_text="现在安全吗？",
                    answer_text="我不想活了，想吃很多药",
                )
            ]
        )

        self.assertEqual(summary.risk_level, "medical_emergency")
        self.assertEqual(summary.next_action.route, "help")
        self.assertEqual(len(summary.insight_cards), 5)
        self.assertTrue(summary.safety.should_contact_family)
        self.assertIn("陪", summary.family_message)

    def test_senior_summary_fallback_for_loneliness_recommends_connection(self):
        from app.schemas.senior import SeniorQuestionAnswer
        from app.services.senior.summary_service import build_fallback_summary

        summary = build_fallback_summary(
            [
                SeniorQuestionAnswer(
                    question_id="social_support",
                    question_text="今天一个人的时间多吗？",
                    answer_text="很孤单，想有人陪我聊聊天",
                ),
                SeniorQuestionAnswer(
                    question_id="support_need",
                    question_text="今天希望我怎么陪您？",
                    answer_text="想聊天",
                ),
            ]
        )

        combined = " ".join([summary.summary_title, summary.plain_summary, summary.family_message])
        self.assertIn("陪", combined)
        self.assertIn(summary.next_action.route, {"chat", "help", "relax"})
        self.assertEqual(len(summary.insight_cards), 5)

    def test_standard_counselor_context_includes_project_resources(self):
        from app.services.llm.counselor import CounselorService, ResponseStyle

        context = CounselorService()._build_context(
            user_message="我最近考试压力很大，晚上睡不着。",
            emotion_context={"risk_level": "moderate"},
            style=ResponseStyle.EMPATHETIC,
        )

        self.assertIn("NeuraSense 完整功能中的心理健康对话", context)
        self.assertIn("我最近考试压力很大，晚上睡不着。", context)
        self.assertIn("压力与呼吸放松", context)


if __name__ == "__main__":
    unittest.main()
