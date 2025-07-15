import os
import io
from PIL import Image
from pptx import Presentation
import PyPDF2
from docx import Document
import tempfile

# 可选导入 - 如果依赖包不可用，功能会被禁用
try:
    import cv2
    OPENCV_AVAILABLE = True
except ImportError:
    OPENCV_AVAILABLE = False
    cv2 = None

try:
    import easyocr
    EASYOCR_AVAILABLE = True
except ImportError:
    EASYOCR_AVAILABLE = False
    easyocr = None

try:
    import speech_recognition as sr
    SPEECH_RECOGNITION_AVAILABLE = True
except ImportError:
    SPEECH_RECOGNITION_AVAILABLE = False
    sr = None

try:
    from moviepy.editor import VideoFileClip
    MOVIEPY_AVAILABLE = True
except ImportError:
    MOVIEPY_AVAILABLE = False
    VideoFileClip = None

try:
    from pydub import AudioSegment
    PYDUB_AVAILABLE = True
except ImportError:
    PYDUB_AVAILABLE = False
    AudioSegment = None

class FileProcessor:
    def __init__(self):
        self.ocr_reader = None
        if EASYOCR_AVAILABLE:
            try:
                self.ocr_reader = easyocr.Reader(['ch_sim', 'en'])
            except Exception as e:
                print(f"警告：EasyOCR 初始化失败: {e}")
                self.ocr_reader = None
        
    def process_file(self, file_path, content_type):
        """
        根据文件类型处理文件并提取文本内容
        """
        try:
            if content_type == 'text':
                return self.extract_text_from_txt(file_path)
            elif content_type == 'ppt':
                return self.extract_text_from_ppt(file_path)
            elif content_type == 'pdf':
                return self.extract_text_from_pdf(file_path)
            elif content_type == 'audio':
                return self.extract_text_from_audio(file_path)
            elif content_type == 'video':
                return self.extract_text_from_video(file_path)
            else:
                raise ValueError(f"不支持的文件类型: {content_type}")
        except Exception as e:
            print(f"处理文件时出错: {str(e)}")
            return ""
    
    def extract_text_from_txt(self, file_path):
        """从文本文件提取内容"""
        try:
            with open(file_path, 'r', encoding='utf-8') as file:
                return file.read()
        except UnicodeDecodeError:
            # 尝试其他编码
            with open(file_path, 'r', encoding='gbk') as file:
                return file.read()
    
    def extract_text_from_ppt(self, file_path):
        """从PowerPoint文件提取文本内容"""
        text_content = []
        presentation = Presentation(file_path)
        
        for slide in presentation.slides:
            # 提取文本框内容
            for shape in slide.shapes:
                if hasattr(shape, "text"):
                    text_content.append(shape.text)
            
            # 提取图片中的文字（OCR）
            for shape in slide.shapes:
                if shape.shape_type == 13:  # Picture
                    try:
                        image = shape.image
                        image_bytes = image.blob
                        pil_image = Image.open(io.BytesIO(image_bytes))
                        
                        # 使用OCR提取图片中的文字（如果可用）
                        if self.ocr_reader is not None:
                            ocr_result = self.ocr_reader.readtext(image_bytes)
                            for detection in ocr_result:
                                text_content.append(detection[1])
                        else:
                            text_content.append("[图片内容 - OCR不可用]")
                    except Exception as e:
                        print(f"OCR处理图片时出错: {str(e)}")
                        continue
        
        return '\n'.join(text_content)
    
    def extract_text_from_pdf(self, file_path):
        """从PDF文件提取文本内容"""
        text_content = []
        
        try:
            with open(file_path, 'rb') as file:
                pdf_reader = PyPDF2.PdfReader(file)
                
                for page_num in range(len(pdf_reader.pages)):
                    page = pdf_reader.pages[page_num]
                    text = page.extract_text()
                    if text.strip():
                        text_content.append(text)
                    
                    # 如果文本提取失败，尝试OCR
                    if not text.strip():
                        try:
                            # 这里需要将PDF页面转换为图片然后OCR
                            # 暂时跳过，需要额外的库如pdf2image
                            pass
                        except Exception as e:
                            print(f"OCR处理PDF页面时出错: {str(e)}")
                            continue
        except Exception as e:
            print(f"读取PDF文件时出错: {str(e)}")
        
        return '\n'.join(text_content)
    
    def extract_text_from_audio(self, file_path):
        """从音频文件提取文本内容（语音识别）"""
        if not SPEECH_RECOGNITION_AVAILABLE or not PYDUB_AVAILABLE:
            return "[音频文字 - 语音识别库不可用]"
            
        recognizer = sr.Recognizer()
        
        try:
            # 将音频文件转换为wav格式
            audio = AudioSegment.from_file(file_path)
            
            # 创建临时wav文件
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_wav:
                audio.export(temp_wav.name, format="wav")
                
                # 使用语音识别
                with sr.AudioFile(temp_wav.name) as source:
                    audio_data = recognizer.record(source)
                    
                # 尝试识别（中文和英文）
                try:
                    text = recognizer.recognize_google(audio_data, language='zh-CN')
                except sr.UnknownValueError:
                    try:
                        text = recognizer.recognize_google(audio_data, language='en-US')
                    except sr.UnknownValueError:
                        text = ""
                
                # 清理临时文件
                os.unlink(temp_wav.name)
                
                return text
                
        except Exception as e:
            print(f"音频识别时出错: {str(e)}")
            return ""
    
    def extract_text_from_video(self, file_path):
        """从视频文件提取文本内容（音频转文字 + OCR画面文字）"""
        if not MOVIEPY_AVAILABLE:
            return "[视频文字 - MoviePy库不可用]"
            
        text_content = []
        
        try:
            # 加载视频
            video = VideoFileClip(file_path)
            
            # 提取音频并转换为文字
            if video.audio:
                with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as temp_audio:
                    video.audio.write_audiofile(temp_audio.name)
                    audio_text = self.extract_text_from_audio(temp_audio.name)
                    if audio_text:
                        text_content.append(f"音频内容: {audio_text}")
                    os.unlink(temp_audio.name)
            
            # 提取关键帧并OCR识别文字
            duration = video.duration
            num_frames = min(10, int(duration))  # 最多提取10帧
            
            for i in range(num_frames):
                timestamp = (duration / num_frames) * i
                frame = video.get_frame(timestamp)
                
                # 将帧转换为PIL图像
                pil_image = Image.fromarray(frame)
                
                # 将PIL图像转换为字节
                img_byte_arr = io.BytesIO()
                pil_image.save(img_byte_arr, format='PNG')
                img_byte_arr = img_byte_arr.getvalue()
                
                # OCR识别（如果可用）
                try:
                    if self.ocr_reader is not None:
                        ocr_result = self.ocr_reader.readtext(img_byte_arr)
                        frame_text = []
                        for detection in ocr_result:
                            if detection[2] > 0.5:  # 置信度阈值
                                frame_text.append(detection[1])
                    else:
                        frame_text = ["[视频帧文字 - OCR不可用]"]
                    
                    if frame_text:
                        text_content.append(f"画面文字 ({timestamp:.1f}s): {' '.join(frame_text)}")
                except Exception as e:
                    print(f"OCR处理视频帧时出错: {str(e)}")
                    continue
            
            video.close()
            
        except Exception as e:
            print(f"处理视频文件时出错: {str(e)}")
        
        return '\n'.join(text_content)
    
    def extract_text_from_docx(self, file_path):
        """从Word文档提取文本内容"""
        try:
            doc = Document(file_path)
            text_content = []
            
            for paragraph in doc.paragraphs:
                if paragraph.text.strip():
                    text_content.append(paragraph.text)
            
            return '\n'.join(text_content)
        except Exception as e:
            print(f"处理Word文档时出错: {str(e)}")
            return ""

# 文件类型检测函数
def detect_file_type(filename):
    """根据文件扩展名检测文件类型"""
    ext = os.path.splitext(filename)[1].lower()
    
    type_mapping = {
        '.txt': 'text',
        '.md': 'text',
        '.ppt': 'ppt',
        '.pptx': 'ppt',
        '.pdf': 'pdf',
        '.doc': 'text',
        '.docx': 'text',
        '.mp3': 'audio',
        '.wav': 'audio',
        '.m4a': 'audio',
        '.flac': 'audio',
        '.mp4': 'video',
        '.avi': 'video',
        '.mov': 'video',
        '.wmv': 'video',
        '.flv': 'video'
    }
    
    return type_mapping.get(ext, 'unknown')
