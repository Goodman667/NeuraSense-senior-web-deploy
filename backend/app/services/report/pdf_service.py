"""
PDF Report Generation Service

Generates professional PDF reports for psychological assessments.
Uses reportlab library for PDF generation with Chinese font support.
"""

from io import BytesIO
from datetime import datetime
from typing import Optional
import base64
import os

# Note: reportlab needs to be installed: pip install reportlab
try:
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib.units import cm
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfbase.ttfonts import TTFont
    from reportlab.pdfbase.cidfonts import UnicodeCIDFont
    REPORTLAB_AVAILABLE = True
except ImportError:
    REPORTLAB_AVAILABLE = False

# 注册中文字体
CHINESE_FONT_REGISTERED = False
FONT_NAME = 'SimSun'  # Default fallback

if REPORTLAB_AVAILABLE:
    try:
        # 尝试注册微软雅黑字体 (Windows)
        msyh_paths = [
            'C:/Windows/Fonts/msyh.ttc',
            'C:/Windows/Fonts/msyh.ttf',
            'C:/Windows/Fonts/simhei.ttf',
            'C:/Windows/Fonts/simsun.ttc',
        ]
        
        for font_path in msyh_paths:
            if os.path.exists(font_path):
                if font_path.endswith('.ttc'):
                    pdfmetrics.registerFont(TTFont('ChineseFont', font_path, subfontIndex=0))
                else:
                    pdfmetrics.registerFont(TTFont('ChineseFont', font_path))
                FONT_NAME = 'ChineseFont'
                CHINESE_FONT_REGISTERED = True
                print(f"PDF Service: Registered Chinese font from {font_path}")
                break
        
        if not CHINESE_FONT_REGISTERED:
            # 尝试使用CID字体作为备选
            pdfmetrics.registerFont(UnicodeCIDFont('STSong-Light'))
            FONT_NAME = 'STSong-Light'
            CHINESE_FONT_REGISTERED = True
            print("PDF Service: Using STSong-Light CID font")
    except Exception as e:
        print(f"PDF Service: Failed to register Chinese font: {e}")
        # Use default font, will show garbled text for Chinese


# 量表信息
SCALE_INFO = {
    'phq9': {
        'name': 'PHQ-9 抑郁筛查量表',
        'max_score': 27,
        'levels': [
            (0, 4, '正常', '无明显抑郁症状'),
            (5, 9, '轻度', '存在轻度抑郁倾向，建议关注自身情绪变化'),
            (10, 14, '中度', '中度抑郁症状，建议寻求专业心理咨询'),
            (15, 19, '中重度', '存在明显抑郁症状，建议尽快就医'),
            (20, 27, '重度', '重度抑郁症状，请立即寻求专业帮助'),
        ]
    },
    'gad7': {
        'name': 'GAD-7 焦虑筛查量表',
        'max_score': 21,
        'levels': [
            (0, 4, '正常', '无明显焦虑症状'),
            (5, 9, '轻度', '轻度焦虑，可通过放松练习缓解'),
            (10, 14, '中度', '中度焦虑，建议寻求专业帮助'),
            (15, 21, '重度', '重度焦虑，请尽快就医'),
        ]
    },
    'sds': {
        'name': 'SDS 抑郁自评量表',
        'max_score': 80,
        'levels': [
            (0, 49, '正常', '无明显抑郁症状'),
            (50, 59, '轻度', '轻度抑郁'),
            (60, 69, '中度', '中度抑郁'),
            (70, 80, '重度', '重度抑郁'),
        ]
    },
    'sas': {
        'name': 'SAS 焦虑自评量表',
        'max_score': 80,
        'levels': [
            (0, 49, '正常', '无明显焦虑症状'),
            (50, 59, '轻度', '轻度焦虑'),
            (60, 69, '中度', '中度焦虑'),
            (70, 80, '重度', '重度焦虑'),
        ]
    },
    'pss10': {
        'name': 'PSS-10 压力感知量表',
        'max_score': 40,
        'levels': [
            (0, 13, '低压力', '压力水平良好'),
            (14, 26, '中等压力', '存在一定压力'),
            (27, 40, '高压力', '压力较大，建议调节'),
        ]
    },
}


# English labels for the report when the app is in English mode (X-Lang: en)
_EN = {
    'PHQ-9 抑郁筛查量表': 'PHQ-9 Depression Screening',
    'GAD-7 焦虑筛查量表': 'GAD-7 Anxiety Screening',
    'SDS 抑郁自评量表': 'SDS Self-Rating Depression Scale',
    'SAS 焦虑自评量表': 'SAS Self-Rating Anxiety Scale',
    'PSS-10 压力感知量表': 'PSS-10 Perceived Stress Scale',
    '正常': 'Normal', '轻度': 'Mild', '中度': 'Moderate', '中重度': 'Moderately severe', '重度': 'Severe',
    '低压力': 'Low stress', '中等压力': 'Moderate stress', '高压力': 'High stress',
    '未知': 'Unknown', '无法判断': 'Cannot be determined',
    '无明显抑郁症状': 'No notable depressive symptoms',
    '存在轻度抑郁倾向，建议关注自身情绪变化': 'Mild depressive tendency; keep an eye on changes in your mood',
    '中度抑郁症状，建议寻求专业心理咨询': 'Moderate depressive symptoms; professional counselling is recommended',
    '存在明显抑郁症状，建议尽快就医': 'Marked depressive symptoms; please see a doctor soon',
    '重度抑郁症状，请立即寻求专业帮助': 'Severe depressive symptoms; please seek professional help now',
    '无明显焦虑症状': 'No notable anxiety symptoms',
    '轻度焦虑，可通过放松练习缓解': 'Mild anxiety; relaxation exercises can help',
    '中度焦虑，建议寻求专业帮助': 'Moderate anxiety; professional help is recommended',
    '重度焦虑，请尽快就医': 'Severe anxiety; please see a doctor soon',
    '轻度抑郁': 'Mild depression', '中度抑郁': 'Moderate depression', '重度抑郁': 'Severe depression',
    '轻度焦虑': 'Mild anxiety', '中度焦虑': 'Moderate anxiety', '重度焦虑': 'Severe anxiety',
    '压力水平良好': 'Stress level is fine', '存在一定压力': 'Some stress present', '压力较大，建议调节': 'High stress; consider ways to ease it',
    '心理评估报告': 'Psychological Assessment Report',
    '评估日期': 'Date', '评估对象': 'Name', '匿名用户': 'Anonymous user', '总分': 'Total score', '评估结果': 'Result',
    '评估解读': 'Interpretation', 'AI 专业建议': 'AI suggestions', '后续建议': 'Next steps', '免责声明': 'Disclaimer',
    '本报告仅供参考，不能作为临床诊断依据。如您正在经历严重心理困扰，请及时寻求专业心理咨询或医疗帮助。24小时心理援助热线：400-161-9995':
        'This report is for reference only and is not a clinical diagnosis. If you are in serious distress, please seek '
        'professional counselling or medical help promptly. 24-hour psychological support hotline (mainland China): '
        '400-161-9995. Elsewhere, contact your local emergency number or crisis line.',
    '继续保持健康的生活方式': 'Keep up a healthy lifestyle',
    '定期进行自我评估，关注情绪变化': 'Check in with yourself regularly and notice changes in your mood',
    '保持规律的运动和充足的睡眠': 'Keep regular exercise and enough sleep',
    '尝试深呼吸、冥想等放松技巧': 'Try relaxation techniques such as deep breathing and meditation',
    '增加运动量，每天至少30分钟有氧运动': 'Exercise more: at least 30 minutes of aerobic activity a day',
    '与亲友保持沟通，分享你的感受': 'Stay in touch with family and friends and share how you feel',
    '如症状持续，建议咨询专业心理咨询师': 'If symptoms persist, consider seeing a professional counsellor',
    '建议尽快预约心理咨询': 'Book a counselling appointment soon',
    '减少工作压力，保证充足休息': 'Reduce work pressure and make sure you get enough rest',
    '避免独处，多与支持性的人交流': 'Avoid being alone too much; spend time with supportive people',
    '可以尝试正念冥想等放松技巧': 'You can try relaxation techniques such as mindfulness meditation',
    '请立即寻求专业心理治疗': 'Please seek professional psychological treatment now',
    '24小时心理援助热线：400-161-9995': '24-hour psychological support hotline (mainland China): 400-161-9995; elsewhere, your local crisis line',
    '不要独自承受，让家人朋友知道你的状况': "Don't carry this alone; let family and friends know how you are",
    '如有自伤想法，请立即前往最近医院急诊': 'If you have thoughts of harming yourself, go to the nearest hospital emergency department now',
}


def _t(text: str) -> str:
    """English text for report labels in English mode; unchanged in Chinese mode."""
    try:
        from app.utils.lang import is_english
        if is_english():
            return _EN.get(text, text)
    except Exception:
        pass
    return text


class PDFReportService:
    """PDF 报告生成服务"""

    def __init__(self):
        if not REPORTLAB_AVAILABLE:
            raise ImportError("reportlab is required for PDF generation. Install with: pip install reportlab")

    def _get_severity_info(self, scale_type: str, score: int) -> tuple:
        """获取严重程度信息"""
        info = SCALE_INFO.get(scale_type, {})
        levels = info.get('levels', [])
        for min_score, max_score, level, desc in levels:
            if min_score <= score <= max_score:
                return level, desc
        return '未知', '无法判断'

    def generate_report(
        self,
        scale_type: str,
        total_score: int,
        answers: list,
        ai_interpretation: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> bytes:
        """生成 PDF 报告"""

        buffer = BytesIO()
        doc = SimpleDocTemplate(
            buffer,
            pagesize=A4,
            rightMargin=2*cm,
            leftMargin=2*cm,
            topMargin=2*cm,
            bottomMargin=2*cm,
        )

        # English report with no Chinese content: use a standard Latin font, which reads better
        font_name = FONT_NAME
        if _t('总分') == 'Total score':
            import re as _re
            if not _re.search(r'[\u3400-\u9fff]', f"{user_name or ''}{ai_interpretation or ''}"):
                font_name = 'Helvetica'

        # 构建使用中文字体的样式
        title_style = ParagraphStyle(
            'ChineseTitle',
            fontName=font_name,
            fontSize=24,
            textColor=colors.HexColor('#4F46E5'),
            spaceAfter=20,
            alignment=1,  # Center
            leading=30,
        )
        heading_style = ParagraphStyle(
            'ChineseHeading',
            fontName=font_name,
            fontSize=14,
            textColor=colors.HexColor('#1F2937'),
            spaceBefore=15,
            spaceAfter=10,
            leading=20,
        )
        normal_style = ParagraphStyle(
            'ChineseNormal',
            fontName=font_name,
            fontSize=11,
            textColor=colors.HexColor('#374151'),
            leading=18,
        )
        disclaimer_style = ParagraphStyle(
            'ChineseDisclaimer',
            fontName=font_name,
            fontSize=9,
            textColor=colors.HexColor('#6B7280'),
            leading=14,
        )

        # 构建内容
        story = []

        # 标题
        scale_info = SCALE_INFO.get(scale_type, {'name': scale_type, 'max_score': 100})
        story.append(Paragraph(_t("心理评估报告"), title_style))
        story.append(Paragraph(_t(scale_info['name']), heading_style))
        story.append(Spacer(1, 10))

        # 基本信息表格
        severity, description = self._get_severity_info(scale_type, total_score)
        info_data = [
            [_t('评估日期'), datetime.now().strftime('%d %B %Y' if _t('总分') == 'Total score' else '%Y年%m月%d日')],
            [_t('评估对象'), user_name or _t('匿名用户')],
            [_t('总分'), f"{total_score} / {scale_info['max_score']}"],
            [_t('评估结果'), _t(severity)],
        ]
        info_table = Table(info_data, colWidths=[3*cm, 10*cm])
        info_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, -1), colors.HexColor('#F3F4F6')),
            ('TEXTCOLOR', (0, 0), (-1, -1), colors.HexColor('#1F2937')),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, -1), font_name),
            ('FONTSIZE', (0, 0), (-1, -1), 11),
            ('PADDING', (0, 0), (-1, -1), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.HexColor('#E5E7EB')),
        ]))
        story.append(info_table)
        story.append(Spacer(1, 20))

        # 结果解读
        story.append(Paragraph(_t("评估解读"), heading_style))
        story.append(Paragraph(_t(description), normal_style))
        story.append(Spacer(1, 15))

        # AI 解读
        if ai_interpretation:
            story.append(Paragraph(_t("AI 专业建议"), heading_style))
            # 处理AI解读中的换行
            ai_text = ai_interpretation.replace('\n', '<br/>')
            story.append(Paragraph(ai_text, normal_style))
            story.append(Spacer(1, 15))

        # 建议
        story.append(Paragraph(_t("后续建议"), heading_style))
        recommendations = self._get_recommendations(severity)
        for rec in recommendations:
            story.append(Paragraph(f"• {_t(rec)}", normal_style))
        story.append(Spacer(1, 20))

        # 免责声明
        story.append(Paragraph(_t("免责声明"), heading_style))
        story.append(Paragraph(
            _t("本报告仅供参考，不能作为临床诊断依据。如您正在经历严重心理困扰，"
               "请及时寻求专业心理咨询或医疗帮助。24小时心理援助热线：400-161-9995"),
            disclaimer_style
        ))

        # 生成 PDF
        doc.build(story)
        pdf_bytes = buffer.getvalue()
        buffer.close()

        return pdf_bytes

    def _get_recommendations(self, severity: str) -> list:
        """根据严重程度获取建议"""
        if severity in ['正常', '低压力']:
            return [
                '继续保持健康的生活方式',
                '定期进行自我评估，关注情绪变化',
                '保持规律的运动和充足的睡眠',
            ]
        elif severity in ['轻度', '中等压力']:
            return [
                '尝试深呼吸、冥想等放松技巧',
                '增加运动量，每天至少30分钟有氧运动',
                '与亲友保持沟通，分享你的感受',
                '如症状持续，建议咨询专业心理咨询师',
            ]
        elif severity in ['中度']:
            return [
                '建议尽快预约心理咨询',
                '减少工作压力，保证充足休息',
                '避免独处，多与支持性的人交流',
                '可以尝试正念冥想等放松技巧',
            ]
        else:  # 重度
            return [
                '请立即寻求专业心理治疗',
                '24小时心理援助热线：400-161-9995',
                '不要独自承受，让家人朋友知道你的状况',
                '如有自伤想法，请立即前往最近医院急诊',
            ]

    def generate_base64(
        self,
        scale_type: str,
        total_score: int,
        answers: list,
        ai_interpretation: Optional[str] = None,
        user_name: Optional[str] = None,
    ) -> str:
        """生成 Base64 编码的 PDF"""
        pdf_bytes = self.generate_report(
            scale_type=scale_type,
            total_score=total_score,
            answers=answers,
            ai_interpretation=ai_interpretation,
            user_name=user_name,
        )
        return base64.b64encode(pdf_bytes).decode('utf-8')


# 全局实例
try:
    pdf_service = PDFReportService()
except ImportError:
    pdf_service = None
