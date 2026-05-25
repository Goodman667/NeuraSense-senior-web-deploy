from app.services.program_assessment_service import (
    build_day_assessment_questions,
    build_pre_assessment_questions,
    build_fallback_feedback,
)


def test_pre_assessment_questions_are_related_to_sleep_program():
    program = {"id": "sleep-7", "title": "7 天睡眠改善计划", "category": "sleep"}

    questions = build_pre_assessment_questions(program)

    assert len(questions) == 3
    joined = " ".join(q["text"] for q in questions)
    assert "睡" in joined
    assert all(q["options"] for q in questions)


def test_day_assessment_questions_include_day_title_and_review_focus():
    program = {"id": "stress-7", "title": "7 天减压训练营", "category": "stress"}
    day = {
        "day_number": 2,
        "title": "呼吸即药 — 激活副交感神经",
        "review_question": "练习 4-7-8 呼吸后，你的身体感受有什么变化？",
    }

    questions = build_day_assessment_questions(program, day)

    assert len(questions) == 3
    assert "呼吸" in questions[0]["text"]
    assert "生活里" in questions[-1]["text"]


def test_fallback_feedback_mentions_next_small_action():
    feedback = build_fallback_feedback(
        phase="post_day",
        program={"title": "7 天减压训练营", "category": "stress"},
        day={"day_number": 1, "title": "认识压力"},
        responses=[{"question_id": "q1", "answer_value": 2, "answer_text": "有一点"}],
    )

    assert "下一次" in feedback["next_step"] or "今天" in feedback["next_step"]
    assert feedback["tone"] in {"steady", "encouraging", "supportive"}
