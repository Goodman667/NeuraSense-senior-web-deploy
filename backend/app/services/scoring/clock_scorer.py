"""
Clock Drawing Test Scorer

Scoring for Clock Drawing Test (CDT) with AI vision analysis (primary)
and OpenCV-based fallback. Implements simplified Rouleau scoring criteria (0-3 points).

Scoring Criteria:
- Clock Face (1 point): Circular shape completeness
- Clock Hands (1 point): Two hands pointing to ~11:10 position
- Numbers (1 point): 1-12 present and reasonably distributed
"""

import base64
import json
import math
import os
import re
from dataclasses import dataclass, field
from typing import Optional

import cv2
import numpy as np


# AI analysis prompt for vision model
CDT_ANALYSIS_PROMPT = """你是一位神经心理学专家，正在评估一幅画钟测验（Clock Drawing Test）的图像。
被测者被要求画一个时钟，并将指针设置为 11:10。

请根据以下三个维度评分（每项 0 或 1 分）：

1. **表盘（clock_face）**：圆形是否大致完整闭合？
2. **数字（numbers）**：1-12 的数字是否都有？位置是否大致均匀分布？
3. **指针（hands）**：是否有两根指针？是否大致指向 11 和 2 的方向（表示 11:10）？

评分宽松一些，这是手绘画板上用鼠标/手指画的，不要求完美。

请严格用以下 JSON 格式回复，不要输出任何其他内容：
{"clock_face_score":0,"clock_face_reason":"简要说明","numbers_score":0,"numbers_reason":"简要说明","clock_hands_score":0,"clock_hands_reason":"简要说明","total_score":0,"overall_assessment":"2-3句总体评价，用温和鼓励的语气","suggestions":["改进建议1","改进建议2"]}"""


@dataclass
class ClockScoringResult:
    """
    Result of clock drawing test scoring.
    包含画钟测验评分结果
    """

    # Total score (0-3)
    total_score: int

    # Individual scores
    clock_face_score: int  # 0 or 1
    clock_hands_score: int  # 0 or 1
    numbers_score: int  # 0 or 1

    # Detailed feedback in Chinese
    feedback: list[str] = field(default_factory=list)

    # Debug info (OpenCV)
    detected_roundness: Optional[float] = None
    detected_hands_angle: Optional[float] = None
    detected_number_count: Optional[int] = None

    # AI analysis fields
    ai_interpretation: Optional[str] = None
    suggestions: Optional[list[str]] = None
    scoring_method: str = "opencv"

    def to_dict(self) -> dict:
        """Convert to dictionary for JSON serialization."""
        return {
            "total_score": self.total_score,
            "clock_face_score": self.clock_face_score,
            "clock_hands_score": self.clock_hands_score,
            "numbers_score": self.numbers_score,
            "feedback": self.feedback,
            "details": {
                "roundness": self.detected_roundness,
                "hands_angle": self.detected_hands_angle,
                "number_count": self.detected_number_count,
            },
            "ai_interpretation": self.ai_interpretation,
            "suggestions": self.suggestions,
            "scoring_method": self.scoring_method,
        }


class ClockDrawingScorer:
    """
    Clock Drawing Test automatic scorer using OpenCV.
    画钟测验自动评分器
    """
    
    # Scoring thresholds
    ROUNDNESS_THRESHOLD = 0.8  # Minimum roundness for valid clock face
    ANGLE_TOLERANCE = 15  # Degrees tolerance for hand angle
    TARGET_ANGLE = 60  # Target angle between hands (11:10 position)
    MIN_NUMBER_COUNT = 10  # Minimum number contours
    MAX_NUMBER_COUNT = 14  # Maximum number contours
    
    def __init__(self):
        """Initialize the scorer."""
        pass

    def ai_score_from_base64(self, image_base64: str) -> ClockScoringResult:
        """
        Score a clock drawing using ZhipuAI vision model.
        使用智谱 AI 视觉模型评分画钟测验

        Falls back to OpenCV scoring on failure.
        """
        try:
            from zhipuai import ZhipuAI

            api_key = os.getenv("LLM_API_KEY", "")
            client = ZhipuAI(api_key=api_key)

            # Strip data URL prefix for the API call
            raw_b64 = image_base64
            if "," in raw_b64:
                raw_b64 = raw_b64.split(",", 1)[1]

            response = client.chat.completions.create(
                model="glm-4v-flash",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {
                                "type": "image_url",
                                "image_url": {
                                    "url": f"data:image/png;base64,{raw_b64}"
                                },
                            },
                            {"type": "text", "text": CDT_ANALYSIS_PROMPT},
                        ],
                    }
                ],
                temperature=0.3,
                max_tokens=800,
            )

            reply = response.choices[0].message.content.strip()

            # Extract JSON from response (handle markdown code blocks)
            json_match = re.search(r"\{.*\}", reply, re.DOTALL)
            if not json_match:
                raise ValueError(f"No JSON found in AI response: {reply[:200]}")

            data = json.loads(json_match.group())

            face_score = int(data.get("clock_face_score", 0))
            hands_score = int(data.get("clock_hands_score", 0))
            numbers_score = int(data.get("numbers_score", 0))
            total = face_score + hands_score + numbers_score

            feedback = [
                data.get("clock_face_reason", ""),
                data.get("clock_hands_reason", ""),
                data.get("numbers_reason", ""),
            ]
            feedback = [f for f in feedback if f]

            return ClockScoringResult(
                total_score=total,
                clock_face_score=face_score,
                clock_hands_score=hands_score,
                numbers_score=numbers_score,
                feedback=feedback,
                ai_interpretation=data.get("overall_assessment"),
                suggestions=data.get("suggestions"),
                scoring_method="ai",
            )

        except Exception as e:
            print(f"[CDT] AI scoring failed, falling back to OpenCV: {e}")
            return self.score_from_base64(image_base64)
    
    def score_from_base64(self, image_base64: str) -> ClockScoringResult:
        """
        Score a clock drawing from base64 encoded image.
        从 Base64 编码的图片进行评分
        
        Args:
            image_base64: Base64 encoded image string
            
        Returns:
            ClockScoringResult with scores and feedback
        """
        # Decode base64 to image
        image = self._decode_base64_image(image_base64)
        if image is None:
            return ClockScoringResult(
                total_score=0,
                clock_face_score=0,
                clock_hands_score=0,
                numbers_score=0,
                feedback=["图像解码失败，请检查图片格式"]
            )
        
        return self.score_image(image)
    
    def score_image(self, image: np.ndarray) -> ClockScoringResult:
        """
        Score a clock drawing from numpy array image.
        从图像数组进行评分
        
        Args:
            image: OpenCV image (BGR format)
            
        Returns:
            ClockScoringResult with scores and feedback
        """
        # Preprocess image
        processed = self._preprocess_image(image)
        
        # Initialize scores and feedback
        feedback = []
        
        # 1. Clock face detection (1 point)
        face_score, roundness, circle = self._detect_clock_face(processed, image)
        if face_score == 1:
            feedback.append("表盘绘制完整，圆形度良好")
        else:
            feedback.append("表盘形状不够圆整，需要改进")
        
        # 2. Clock hands analysis (1 point)
        hands_score, angle = self._analyze_clock_hands(processed, circle)
        if hands_score == 1:
            feedback.append("指针位置正确，符合11点10分设置")
        else:
            if angle is not None:
                feedback.append(f"指针角度有偏差（检测到 {angle:.1f}°，期望约 {self.TARGET_ANGLE}°）")
            else:
                feedback.append("无法检测到清晰的时针和分针")
        
        # 3. Number detection (1 point)
        numbers_score, count = self._detect_numbers(processed)
        if numbers_score == 1:
            feedback.append(f"数字书写清晰，检测到 {count} 个数字区域")
        else:
            if count is not None:
                feedback.append(f"数字数量不符（检测到 {count} 个，应接近 12 个）")
            else:
                feedback.append("数字书写不够清晰")
        
        # Calculate total score
        total_score = face_score + hands_score + numbers_score
        
        return ClockScoringResult(
            total_score=total_score,
            clock_face_score=face_score,
            clock_hands_score=hands_score,
            numbers_score=numbers_score,
            feedback=feedback,
            detected_roundness=roundness,
            detected_hands_angle=angle,
            detected_number_count=count,
        )
    
    def _decode_base64_image(self, image_base64: str) -> Optional[np.ndarray]:
        """
        Decode base64 string to OpenCV image.
        解码 Base64 图片字符串
        """
        try:
            # Remove data URL prefix if present
            if "," in image_base64:
                image_base64 = image_base64.split(",")[1]
            
            # Decode base64
            image_data = base64.b64decode(image_base64)
            
            # Convert to numpy array
            nparr = np.frombuffer(image_data, np.uint8)
            
            # Decode image
            image = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            
            return image
        except Exception as e:
            print(f"Failed to decode base64 image: {e}")
            return None
    
    def _preprocess_image(self, image: np.ndarray) -> np.ndarray:
        """
        Preprocess image for analysis.
        图像预处理：灰度化、高斯模糊、自适应二值化
        
        Args:
            image: BGR image
            
        Returns:
            Preprocessed binary image
        """
        # Convert to grayscale
        gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
        
        # Apply Gaussian blur to reduce noise
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        
        # Adaptive thresholding for binary image
        binary = cv2.adaptiveThreshold(
            blurred,
            255,
            cv2.ADAPTIVE_THRESH_GAUSSIAN_C,
            cv2.THRESH_BINARY_INV,
            11,  # Block size
            2    # Constant subtracted from mean
        )
        
        return binary
    
    def _detect_clock_face(
        self, 
        binary: np.ndarray,
        original: np.ndarray
    ) -> tuple[int, Optional[float], Optional[tuple]]:
        """
        Detect clock face using Hough Circle detection.
        使用霍夫圆检测表盘
        
        Args:
            binary: Preprocessed binary image
            original: Original BGR image for dimension reference
            
        Returns:
            (score, roundness, circle) where circle is (x, y, radius)
        """
        # Get image dimensions
        height, width = binary.shape[:2]
        min_radius = min(height, width) // 6
        max_radius = min(height, width) // 2
        
        # Detect circles using Hough transform
        circles = cv2.HoughCircles(
            binary,
            cv2.HOUGH_GRADIENT,
            dp=1.2,
            minDist=min(height, width) // 2,
            param1=50,
            param2=30,
            minRadius=min_radius,
            maxRadius=max_radius
        )
        
        if circles is None or len(circles[0]) == 0:
            # Fallback: try to find circular contour
            return self._detect_clock_face_by_contour(binary)
        
        # Get the largest circle
        circles = np.uint16(np.around(circles))
        best_circle = circles[0][0]
        x, y, radius = best_circle
        
        # Calculate roundness using contour analysis
        # Create a mask for the detected circle area
        mask = np.zeros(binary.shape, dtype=np.uint8)
        cv2.circle(mask, (x, y), radius, 255, -1)
        
        # Find contours in the circle region
        masked = cv2.bitwise_and(binary, mask)
        contours, _ = cv2.findContours(masked, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if contours:
            # Get the largest contour
            largest_contour = max(contours, key=cv2.contourArea)
            
            # Calculate roundness: 4π * Area / Perimeter²
            area = cv2.contourArea(largest_contour)
            perimeter = cv2.arcLength(largest_contour, True)
            
            if perimeter > 0:
                roundness = (4 * math.pi * area) / (perimeter * perimeter)
            else:
                roundness = 0.0
        else:
            # Assume perfect circle if using Hough detection
            roundness = 0.85
        
        # Score based on roundness threshold
        score = 1 if roundness >= self.ROUNDNESS_THRESHOLD else 0
        
        return score, roundness, (int(x), int(y), int(radius))
    
    def _detect_clock_face_by_contour(
        self, 
        binary: np.ndarray
    ) -> tuple[int, Optional[float], Optional[tuple]]:
        """
        Fallback: detect clock face using contour analysis.
        备用方法：使用轮廓分析检测表盘
        """
        # Find all contours
        contours, _ = cv2.findContours(binary, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return 0, None, None
        
        # Get the largest contour
        largest_contour = max(contours, key=cv2.contourArea)
        
        # Calculate roundness
        area = cv2.contourArea(largest_contour)
        perimeter = cv2.arcLength(largest_contour, True)
        
        if perimeter == 0:
            return 0, None, None
        
        roundness = (4 * math.pi * area) / (perimeter * perimeter)
        
        # Get bounding circle
        (x, y), radius = cv2.minEnclosingCircle(largest_contour)
        
        score = 1 if roundness >= self.ROUNDNESS_THRESHOLD else 0
        
        return score, roundness, (int(x), int(y), int(radius))
    
    def _analyze_clock_hands(
        self, 
        binary: np.ndarray,
        circle: Optional[tuple]
    ) -> tuple[int, Optional[float]]:
        """
        Analyze clock hands using Hough Line detection.
        使用霍夫线检测分析指针
        
        Args:
            binary: Preprocessed binary image
            circle: Detected circle (x, y, radius) or None
            
        Returns:
            (score, angle_between_hands)
        """
        if circle is None:
            # Use image center as fallback
            height, width = binary.shape[:2]
            center = (width // 2, height // 2)
            radius = min(height, width) // 3
        else:
            center = (circle[0], circle[1])
            radius = circle[2]
        
        # Detect lines using probabilistic Hough transform
        lines = cv2.HoughLinesP(
            binary,
            rho=1,
            theta=np.pi / 180,
            threshold=30,
            minLineLength=radius // 4,
            maxLineGap=10
        )
        
        if lines is None or len(lines) < 2:
            return 0, None
        
        # Find lines that pass near the center
        candidate_lines = []
        center_threshold = radius * 0.3  # 30% of radius
        
        for line in lines:
            x1, y1, x2, y2 = line[0]
            
            # Check if line passes near center
            dist_to_center = self._point_line_distance(center, (x1, y1), (x2, y2))
            
            if dist_to_center <= center_threshold:
                # Calculate line length and angle
                length = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
                angle = math.degrees(math.atan2(y2 - y1, x2 - x1))
                
                candidate_lines.append((length, angle, line[0]))
        
        if len(candidate_lines) < 2:
            return 0, None
        
        # Sort by length (longest are likely the clock hands)
        candidate_lines.sort(key=lambda x: x[0], reverse=True)
        
        # Take the two longest lines as hour and minute hands
        hand1_angle = candidate_lines[0][1]
        hand2_angle = candidate_lines[1][1]
        
        # Calculate angle between hands
        angle_diff = abs(hand1_angle - hand2_angle)
        if angle_diff > 180:
            angle_diff = 360 - angle_diff
        
        # Check if angle is close to target (60° for 11:10)
        # Also check if hands point roughly towards 11 and 2 o'clock
        angle_valid = abs(angle_diff - self.TARGET_ANGLE) <= self.ANGLE_TOLERANCE
        
        # Additional check: verify hand directions
        # 11 o'clock ≈ -60° to -30° from vertical
        # 2 o'clock ≈ 60° from vertical
        direction_valid = self._check_hand_directions(hand1_angle, hand2_angle)
        
        score = 1 if (angle_valid or direction_valid) else 0
        
        return score, angle_diff
    
    def _point_line_distance(
        self, 
        point: tuple[int, int], 
        line_start: tuple[int, int], 
        line_end: tuple[int, int]
    ) -> float:
        """
        Calculate perpendicular distance from point to line segment.
        计算点到线段的垂直距离
        """
        x0, y0 = point
        x1, y1 = line_start
        x2, y2 = line_end
        
        # Line segment length
        line_len = math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2)
        
        if line_len == 0:
            return math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2)
        
        # Distance formula
        dist = abs((y2 - y1) * x0 - (x2 - x1) * y0 + x2 * y1 - y2 * x1) / line_len
        
        return dist
    
    def _check_hand_directions(self, angle1: float, angle2: float) -> bool:
        """
        Check if hands point roughly towards 11 and 2 o'clock.
        检查指针是否大致指向 11 点和 2 点方向
        
        11 o'clock: approximately -60° (or 300°) from rightward
        2 o'clock: approximately 60° from rightward
        """
        # Normalize angles to 0-360 range
        angle1 = angle1 % 360
        angle2 = angle2 % 360
        
        # Expected angles (approximate, with tolerance)
        # Hour hand to 11: around -60° (300°) or around 120° (pointing up-left)
        # Minute hand to 2: around 60° or around -120° (240°) (pointing up-right)
        
        angles = sorted([angle1, angle2])
        
        # Check various valid configurations
        # This is a simplified check
        tolerance = 30
        
        valid_configs = [
            (120, 60),   # 11 and 2 o'clock approximate
            (300, 60),
            (120, 240),
            (-60, 60),
        ]
        
        for expected1, expected2 in valid_configs:
            e1 = expected1 % 360
            e2 = expected2 % 360
            
            match1 = min(abs(angle1 - e1), 360 - abs(angle1 - e1)) <= tolerance
            match2 = min(abs(angle2 - e2), 360 - abs(angle2 - e2)) <= tolerance
            
            if match1 and match2:
                return True
        
        return False
    
    def _detect_numbers(self, binary: np.ndarray) -> tuple[int, Optional[int]]:
        """
        Detect number contours in the clock drawing.
        检测时钟数字轮廓
        
        Args:
            binary: Preprocessed binary image
            
        Returns:
            (score, number_count)
        """
        # Find all contours
        contours, _ = cv2.findContours(binary, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        
        if not contours:
            return 0, None
        
        # Get image dimensions for filtering
        height, width = binary.shape[:2]
        image_area = height * width
        
        # Filter contours by size
        # Numbers should be small but not too small (noise)
        min_area = image_area * 0.0005  # 0.05% of image
        max_area = image_area * 0.05    # 5% of image
        
        valid_number_contours = []
        
        for contour in contours:
            area = cv2.contourArea(contour)
            
            if min_area <= area <= max_area:
                # Additional filter: aspect ratio should be reasonable for digits
                x, y, w, h = cv2.boundingRect(contour)
                aspect_ratio = h / w if w > 0 else 0
                
                # Digits typically have aspect ratio between 0.5 and 3
                if 0.3 <= aspect_ratio <= 4.0:
                    valid_number_contours.append(contour)
        
        count = len(valid_number_contours)
        
        # Score: count should be close to 12
        if self.MIN_NUMBER_COUNT <= count <= self.MAX_NUMBER_COUNT:
            score = 1
        else:
            score = 0
        
        return score, count
