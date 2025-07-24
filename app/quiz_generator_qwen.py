import os
import json
import logging
import asyncio
import time
import re
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from openai import OpenAI

# 加载环境变量
load_dotenv()

logger = logging.getLogger(__name__)

class MockQuizGenerator:
    """
    模拟题目生成器，用于测试和备用
    """
    def __init__(self):
        pass
    
    def generate_quiz(self, text_content: str, num_questions: int = 5) -> List[Dict]:
        """
        生成高质量模拟题目
        """
        
        try:
            # 基于文本内容生成更有深度的模拟题目
            mock_questions = []
            
            # 预设一些极具挑战性的题目模板
            question_templates = [
                {
                    "question": "假设你是一个跨国企业的战略顾问，需要将提供内容中的核心理念整合到一个正面临数字化转型、监管政策变化和全球供应链重构三重挑战的传统制造企业中。在有限的资源预算和18个月的时间窗口内，你如何设计一个既能保持现有业务稳定性，又能实现长期竞争优势的转型策略？考虑到不同利益相关者（股东、员工、客户、监管机构）的期望冲突，你的策略重点应该放在哪个维度？",
                    "options": [
                        "优先建立敏捷的组织架构和跨部门协作机制，通过内部能力建设驱动渐进式创新，同时建立风险管控体系应对外部不确定性",
                        "集中资源进行核心技术突破和产品创新，通过差异化竞争优势抵御市场冲击，延后组织变革以避免内部动荡",
                        "加快外部合作伙伴关系建设，通过生态系统整合获得快速转型能力，同时保持现有运营模式的稳定性",
                        "全面推进数字化基础设施建设，以技术升级带动业务流程重组，通过数据驱动决策实现精益运营"
                    ],
                    "correct_answer": 0,
                    "explanation": "在多重挑战和资源约束下，建立敏捷组织架构是最可持续的选择。选项A考虑了内外部平衡、短期稳定与长期发展的权衡，以及风险管控的重要性。选项B过于激进，可能导致资源分散和内部不稳定；选项C依赖外部资源存在控制风险；选项D技术导向忽略了人文因素和组织适应性。"
                },
                {
                    "question": "在一个由多个自主团队组成的复杂项目中，你发现团队间存在信息孤岛、目标冲突和资源竞争问题。基于提供内容的管理理念，如果你需要设计一套既能保持各团队创新活力和自主性，又能确保整体协调和目标一致的治理机制，你会如何平衡集中控制与分散决策之间的张力？特别是当面临紧急情况需要快速响应时，这套机制应该如何动态调整以确保效率和质量？",
                    "options": [
                        "建立分层决策矩阵和动态授权机制，通过共享KPI体系和定期协调会议实现软性整合，紧急情况下启动临时指挥结构",
                        "实施严格的中央集权管理，通过统一的流程标准和绩效考核确保一致性，设立专门的协调部门处理团队间冲突",
                        "采用完全分散的市场化机制，让团队间通过内部竞争和协商解决冲突，管理层仅提供资源支持和最终仲裁",
                        "构建基于价值观和文化认同的自组织系统，通过培训和激励机制促进自发协作，减少正式的管理干预"
                    ],
                    "correct_answer": 0,
                    "explanation": "选项A提供了灵活性与控制的最佳平衡。分层决策矩阵保证了不同层级的适当授权，共享KPI确保目标一致，定期协调维持信息流通，临时指挥结构应对紧急情况。选项B过于僵化，抑制创新；选项C可能导致混乱和低效；选项D理想化，缺乏必要的结构支撑。"
                },
                {
                    "question": "考虑一个需要在技术创新、用户体验、商业可持续性和社会责任四个维度间寻求平衡的产品决策场景。基于提供内容的核心观点，当这四个目标之间出现根本性冲突时（例如，最具创新性的技术方案可能损害用户隐私，最佳用户体验可能降低商业盈利，最大社会效益可能增加成本负担），你如何构建一个动态权衡框架来指导决策过程？这个框架应该如何处理不同时间尺度上的价值权衡（短期收益vs长期影响）？",
                    "options": [
                        "建立多维价值评估矩阵，结合利益相关者影响分析和时间折现模型，通过情景规划和风险评估确定各维度的动态权重",
                        "采用层次化决策树，以商业可持续性为核心约束条件，在此基础上优化其他三个维度的组合方案",
                        "运用德尔菲法收集专家意见，建立固定的权重体系，然后通过标准化评分方法对不同方案进行量化比较",
                        "实施敏捷试错方法，通过小规模实验快速测试不同权衡方案的效果，根据反馈动态调整优先级"
                    ],
                    "correct_answer": 0,
                    "explanation": "选项A提供了最全面和系统的框架。多维评估矩阵考虑了复杂性，利益相关者分析确保公平性，时间折现处理长短期权衡，情景规划应对不确定性，动态权重保持灵活性。选项B过于简化，可能忽视重要价值；选项C缺乏动态性和情境适应性；选项D虽然灵活但可能缺乏系统性思考。"
                },
                {
                    "question": "在一个快速变化的行业环境中，你负责领导一个跨文化、跨专业的虚拟团队执行一个具有高度不确定性的创新项目。团队成员分布在不同时区，具有不同的工作习惯、沟通风格和风险偏好。基于提供内容的领导力理念，当项目遭遇重大挫折或方向调整时，你如何在维持团队凝聚力和士气的同时，确保快速适应和高质量决策？特别是如何处理团队内部可能出现的文化冲突和专业分歧？",
                    "options": [
                        "建立多元化的沟通渠道和文化桥梁机制，通过共同愿景构建和适应性领导风格来统一团队，结合数据驱动决策和集体智慧整合处理分歧",
                        "实施强势的变革管理，通过明确的指令和严格的执行监控确保团队聚焦，将文化和专业差异视为需要克服的障碍",
                        "采用完全民主化的决策过程，让所有团队成员平等参与讨论和投票，通过多数原则解决冲突和分歧",
                        "建立小组轮岗制度，让团队成员体验不同的角色和文化环境，通过相互理解自然化解冲突"
                    ],
                    "correct_answer": 0,
                    "explanation": "选项A体现了复杂环境下的适应性领导。多元化沟通渠道适应虚拟团队特点，文化桥梁机制处理跨文化挑战，共同愿景提供凝聚力，适应性领导应对不确定性，数据驱动确保决策质量。选项B忽视了多元化的价值；选项C可能导致决策低效和质量下降；选项D虽有价值但在紧急情况下不够实用。"
                }
            ]
            
            for i in range(min(num_questions, len(question_templates))):
                mock_questions.append(question_templates[i])
            
            # 如果需要更多题目，生成额外的超高难度题目
            if num_questions > len(question_templates):
                for i in range(num_questions - len(question_templates)):
                    additional_question = {
                        "question": f"作为一个面临行业颠覆性变革的组织的高级决策者，你需要基于提供内容的第{i+5}个核心概念，设计一个能够在资源约束、时间压力和利益相关者期望冲突的环境下，既保持组织稳定性又推动战略转型的综合方案。考虑到市场不确定性、技术演进速度和组织变革阻力，你如何构建一个动态适应的实施路径？这个路径应该如何在短期生存需求和长期发展愿景之间找到平衡点，同时应对可能出现的连锁反应和意外挑战？",
                        "options": [
                            f"建立双轨并行的组织架构，通过核心业务维稳和创新业务探索的组合，配合渐进式变革管理和持续的风险监控机制",
                            f"集中资源进行关键能力突破，通过概念{i+5}的深度应用获得竞争优势，延缓非核心领域的变革以控制风险",
                            f"采用生态系统整合策略，通过外部合作伙伴网络分散风险，同时保持内部组织架构的相对稳定",
                            f"实施全面数字化转型，以技术创新驱动业务模式重构，通过数据分析和人工智能优化决策过程"
                        ],
                        "correct_answer": 0,
                        "explanation": f"在复杂多变的环境中，双轨并行架构是最能平衡风险与机遇的策略。它既保证了现有业务的稳定现金流，又为未来发展开辟了探索空间。这种方法考虑了组织的适应能力、资源的合理配置、变革的可控性以及对不确定性的应对。其他选项或过于保守、或风险过高、或过度依赖外部因素。"
                    }
                    mock_questions.append(additional_question)
            
            return mock_questions
            
        except Exception as e:
            logger.error(f"高质量模拟题目生成失败: {e}")
            return []

class QuizGenerator:
    def __init__(self):
        # 加载环境变量
        load_dotenv()
        
        # 配置 Qwen API
        self.api_key = os.getenv('QWEN_API_KEY')
        self.use_mock = False
        self.client = None
        self.mock_generator = MockQuizGenerator()  # 保留用于内部测试，但不在generate_quiz中使用
        
        if not self.api_key:
            error_msg = "错误: 未找到QWEN_API_KEY环境变量，无法使用AI出题功能。请配置正确的API密钥。"
            print(error_msg)
            self.use_mock = True
            raise Exception(error_msg)
        else:
            try:
                # 使用 OpenAI 兼容的 Qwen API
                self.client = OpenAI(
                    api_key=self.api_key,
                    base_url="https://dashscope.aliyuncs.com/compatible-mode/v1",
                )
                print("✅ Qwen API 配置成功，已启用高难度AI出题功能")
            except Exception as e:
                error_msg = f"错误: Qwen API 配置失败: {e}"
                print(error_msg)
                self.use_mock = True
                self.client = None
                raise Exception(error_msg)
    
    
    async def _generate_with_qwen_async(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        使用 Qwen API 异步生成题目（动态超时：75-300秒）
        """
        if not self.client:
            raise Exception("Qwen API 客户端未初始化")
        
        # 构建提示词
        # 对于超长内容，给AI一些处理建议
        content_length = len(content_text)
        content_hint = ""
        if content_length > 80000:
            content_hint = f"\n\n注意：内容极其庞大（{content_length}字符），请深度分析全文内容，从中提炼最核心的概念、关键定义、重要理论和实践要点来生成高质量的题目。请确保题目覆盖内容的精华部分。"
        elif content_length > 50000:
            content_hint = f"\n\n注意：内容非常庞大（{content_length}字符），请全面分析文本后，重点关注核心概念、关键定义、重要理论和关键信息生成高质量题目。"
        elif content_length > 30000:
            content_hint = f"\n\n注意：内容非常长（{content_length}字符），请仔细分析全文后，重点关注核心概念、关键定义和重要信息生成高质量题目。"
        elif content_length > 15000:
            content_hint = f"\n\n注意：内容较长（{content_length}字符），请重点关注核心概念和关键信息生成题目。"
        
        prompt = f"""
基于以下内容生成 {num_questions} 道高难度、深层思维的选择题。每道题有4个选项，请标明正确答案序号（0-3）和详细解释。

请严格按照以下JSON格式返回：
{{
    "questions": [
        {{
            "question": "题目内容",
            "options": ["选项A", "选项B", "选项C", "选项D"],
            "correct_answer": 0,
            "explanation": "答案解释"
        }}
    ]
}}

高难度出题要求（必须严格遵守）：
1. 题目必须基于内容进行深度分析和多层推理，挖掘隐含的逻辑关系和深层含义
2. 题目长度至少4-5句话，包含复杂的背景设定、多重条件限制和层次化的问题陈述
3. 绝对禁止任何形式的原文摘录，所有选项必须经过复杂推理和综合分析才能得出
4. 每个选项都要具有高度迷惑性，基于真实的相关概念但存在细微的逻辑错误或适用范围差异
5. 正确答案序号从0开始（0=选项A，1=选项B，2=选项C，3=选项D），但答案不能过于明显，需要深入思考才能确定
6. 解释必须详细分析每个选项的逻辑，说明正确答案的深层原因和其他选项的具体错误所在
7. 题目必须测试高阶认知能力：批判性思维、创新应用、系统分析、战略评估等
8. 避免所有简单直接的表述，使用复杂的情境假设、多变量分析、跨领域应用等场景
9. 选项要体现不同的思维路径和解决方案，每个都有其合理性但只有一个最优
10. 题目应该让即使理解了内容的人也需要仔细思考和分析才能作答

**解释格式要求（重要）：**
- 在解释中必须使用选项字母标识：选项A、选项B、选项C、选项D
- 禁止在解释中使用数字序号如选项0、选项1、选项2、选项3
- 正确的解释格式："选项A提供了最全面的解决方案...选项B虽然考虑了X因素，但忽略了Y...选项C的方法过于激进...选项D缺乏实用性..."

严格要求的题目类型（必须选择）：
- 多维决策分析题：给出复杂的现实场景，要求权衡多个相互冲突的因素做出最优决策
- 系统性思维题：分析复杂系统中的相互作用关系，预测干预措施的连锁反应
- 创新应用题：将理论概念创新性地应用到全新的、跨领域的实际问题中
- 批判性评估题：深入分析某种方法或理论的适用边界、潜在风险和改进方向
- 策略优化题：在资源约束和多重目标冲突的情况下设计最优策略
- 因果链分析题：分析复杂因果关系网络中的关键节点和杠杆点
- 价值判断题：在价值观冲突的情境下进行道德推理和利益权衡

出题示例思路：
- 不要问"什么是X"，而要问"在Y情况下，如何运用X原理解决Z问题，同时兼顾A、B、C三个约束条件"
- 不要问"X有什么特点"，而要问"当X方法在特定环境下失效时，应该如何调整策略以达到预期目标"
- 不要问"X和Y的区别"，而要问"在面临P问题时，选择X还是Y方法更合适，需要考虑哪些深层因素"

只返回JSON，不要其他文字。确保每道题都需要深度思考和多步推理才能解答。

内容：
{content_text}{content_hint}


"""
        
        try:
            # 计算调试信息
            content_length = len(content_text)
            prompt_length = len(prompt)
            system_msg = 'You are a world-class expert in advanced educational assessment, specializing in creating extremely challenging questions that test the highest levels of cognitive ability. Your questions require deep analytical thinking, complex reasoning, strategic decision-making, and synthesis of multiple concepts. You create questions that even experts in the field would need to carefully consider. Focus on scenarios that involve multiple competing priorities, ethical dilemmas, strategic trade-offs, and complex real-world applications. Always respond with valid JSON format. IMPORTANT: In explanations, always refer to options using letters (选项A, 选项B, 选项C, 选项D) never use numbers (选项0, 选项1, 选项2, 选项3).'
            system_msg_length = len(system_msg)
            
            # 估算token数量 (中文约1.5-2字符=1token，英文约4字符=1token)
            estimated_input_tokens = int(content_length * 0.6 + prompt_length * 0.6 + system_msg_length * 0.25)
            
            print(f"🔍 调试信息:")
            print(f"   📄 输入内容长度: {content_length:,} 字符")
            print(f"   📝 Prompt长度: {prompt_length:,} 字符") 
            print(f"   🤖 系统消息长度: {system_msg_length:,} 字符")
            print(f"   🔢 估算输入Token数: {estimated_input_tokens:,} tokens")
            print(f"   ⚙️  模型参数: temperature={0.9}, max_tokens={4000}")
            print(f"   🎯 请求题目数量: {num_questions}")
            
            # 使用 Qwen API 生成内容
            response = self.client.chat.completions.create(
                model="qwen-plus",  # 使用qwen-plus模型
                messages=[
                    {'role': 'system', 'content': system_msg},
                    {'role': 'user', 'content': prompt}
                ],
                temperature=0.9,  # 进一步提高创造性
                max_tokens=4000,  # 增加token限制以支持更复杂的题目
                timeout=60.0  # 增加到60秒超时，为整体动态超时留出充分缓冲
            )
            
            response_text = response.choices[0].message.content
            
            # 计算响应信息
            response_length = len(response_text)
            estimated_output_tokens = int(response_length * 0.6)  # 估算输出token
            
            print(f"✅ Qwen API 调用成功")
            print(f"   📤 返回内容长度: {response_length:,} 字符")
            print(f"   🔢 估算输出Token数: {estimated_output_tokens:,} tokens")
            print(f"   📊 总估算Token消耗: {estimated_input_tokens + estimated_output_tokens:,} tokens")
            
            # 如果API返回usage信息，打印实际token使用量
            if hasattr(response, 'usage') and response.usage:
                usage = response.usage
                print(f"   ✨ 实际Token使用量:")
                if hasattr(usage, 'prompt_tokens'):
                    print(f"      - 输入tokens: {usage.prompt_tokens:,}")
                if hasattr(usage, 'completion_tokens'):
                    print(f"      - 输出tokens: {usage.completion_tokens:,}")
                if hasattr(usage, 'total_tokens'):
                    print(f"      - 总计tokens: {usage.total_tokens:,}")
            
            return self._parse_response(response_text)
            
        except Exception as e:
            logger.error(f"Qwen API调用失败: {e}")
            raise e
    
    def generate_quiz(self, content_text: str, num_questions: int = 1) -> List[Dict]:
        """
        根据内容文本生成选择题（动态超时：75-300秒）
        强制使用Qwen API，不再使用模拟生成器
        
        Args:
            content_text: 源内容文本
            num_questions: 要生成的题目数量
            
        Returns:
            包含题目信息的字典列表
        """
        # 检查Qwen API是否可用
        if self.use_mock or not self.client:
            raise Exception("Qwen API 未配置或不可用，无法生成题目。请检查 QWEN_API_KEY 环境变量配置。")
        
        # 强制使用真实的 Qwen API (动态超时：75-300秒)
        print("🔄 正在使用 Qwen API 生成高难度题目...")
        start_time = time.time()
        
        # 使用异步方式处理超时
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        
        try:
            # 根据内容长度动态调整超时时间
            content_length = len(content_text)
            if content_length > 100000:
                timeout_seconds = 300.0  # 巨型内容使用5分钟超时
                print(f"📄 检测到巨型内容（{content_length}字符），使用300秒超时...")
            elif content_length > 80000:
                timeout_seconds = 240.0  # 极大内容使用4分钟超时
                print(f"📄 检测到极大内容（{content_length}字符），使用240秒超时...")
            elif content_length > 50000:
                timeout_seconds = 180.0  # 超超长内容使用3分钟超时
                print(f"📄 检测到超超长内容（{content_length}字符），使用180秒超时...")
            elif content_length > 30000:
                timeout_seconds = 150.0  # 超长内容使用2.5分钟超时
                print(f"📄 检测到超长内容（{content_length}字符），使用150秒超时...")
            elif content_length > 20000:
                timeout_seconds = 120.0  # 很长内容使用2分钟超时
                print(f"📄 检测到很长内容（{content_length}字符），使用120秒超时...")
            elif content_length > 10000:
                timeout_seconds = 90.0  # 长内容使用1.5分钟超时
                print(f"📄 检测到长内容（{content_length}字符），使用90秒超时...")
            else:
                timeout_seconds = 75.0  # 普通内容使用75秒超时
            
            # 设置动态超时
            result = loop.run_until_complete(
                asyncio.wait_for(
                    self._generate_with_qwen_async(content_text, num_questions),
                    timeout=timeout_seconds
                )
            )
            
            elapsed_time = time.time() - start_time
            print(f"✅ Qwen API 调用成功，耗时: {elapsed_time:.2f}秒")
            return result
            
        except asyncio.TimeoutError:
            elapsed_time = time.time() - start_time
            error_msg = f"Qwen API 调用超时（{elapsed_time:.1f}秒），请稍后重试或检查网络连接。"
            print(f"⏰ {error_msg}")
            raise Exception(error_msg)
            
        except Exception as e:
            error_msg = f"Qwen API调用失败: {str(e)}"
            print(f"❌ {error_msg}")
            raise Exception(error_msg)
            
        finally:
            loop.close()

    
    def _parse_response(self, response_text: str) -> List[Dict]:
        """解析 Qwen API 返回的响应"""
        try:
            print(f"🔍 开始解析API响应...")
            print(f"   📄 原始响应长度: {len(response_text):,} 字符")
            
            # 清理响应文本
            cleaned_text = response_text.strip()
            
            # 尝试提取JSON部分
            json_match = re.search(r'```json\s*(.*?)\s*```', cleaned_text, re.DOTALL)
            if json_match:
                json_str = json_match.group(1).strip()
                print(f"   ✅ 在markdown代码块中找到JSON")
            else:
                # 寻找花括号包围的JSON
                brace_match = re.search(r'\{.*\}', cleaned_text, re.DOTALL)
                if brace_match:
                    json_str = brace_match.group(0)
                    print(f"   ✅ 在文本中找到JSON对象")
                else:
                    json_str = cleaned_text
                    print(f"   ⚠️  直接使用原始文本作为JSON")
            
            print(f"   📝 提取的JSON长度: {len(json_str):,} 字符")
            
            # 解析JSON
            data = json.loads(json_str)
            print(f"   ✅ JSON解析成功")
            
            # 确保返回的是新格式的题目列表
            if isinstance(data, dict) and 'questions' in data:
                questions = data['questions']
                print(f"   📋 发现questions字段，包含 {len(questions)} 道题目")
            elif isinstance(data, list):
                questions = data
                print(f"   📋 直接发现题目列表，包含 {len(questions)} 道题目")
            else:
                raise ValueError("响应格式不正确")
            
            print(f"   🔍 开始验证和格式化题目...")
            
            # 转换为统一格式
            result = []
            for i, q in enumerate(questions):
                print(f"   📝 处理第 {i+1} 道题目...")
                if isinstance(q, dict) and 'question' in q:
                    formatted_q = {
                        'question': q.get('question', ''),
                        'options': q.get('options', []),
                        'correct_answer': q.get('correct_answer', 0),
                        'explanation': q.get('explanation', ''),
                        'difficulty': q.get('difficulty', 'medium'),
                        'time_estimate': q.get('time_estimate', 20)
                    }
                    
                    # 验证题目内容
                    question_len = len(formatted_q['question'])
                    options_count = len(formatted_q['options'])
                    explanation_len = len(formatted_q['explanation'])
                    
                    print(f"      - 题目长度: {question_len} 字符")
                    print(f"      - 选项数量: {options_count}")
                    print(f"      - 正确答案: 选项{chr(65+formatted_q['correct_answer'])}")
                    print(f"      - 解释长度: {explanation_len} 字符")
                    
                    # 确保选项是列表格式
                    if not isinstance(formatted_q['options'], list):
                        print(f"      ⚠️  选项格式不正确，尝试修复...")
                        formatted_q['options'] = [
                            q.get('option_a', '选项A'),
                            q.get('option_b', '选项B'),
                            q.get('option_c', '选项C'),
                            q.get('option_d', '选项D')
                        ]
                    
                    result.append(formatted_q)
                    print(f"      ✅ 第 {i+1} 道题目处理完成")
                else:
                    print(f"      ❌ 第 {i+1} 道题目格式错误，跳过")
            
            if not result:
                raise ValueError("未能解析出有效题目")
                
            total_questions = len(result)
            avg_question_length = sum(len(q['question']) for q in result) / total_questions if total_questions > 0 else 0
            avg_explanation_length = sum(len(q['explanation']) for q in result) / total_questions if total_questions > 0 else 0
            
            print(f"📊 解析完成统计:")
            print(f"   ✅ 成功解析 {total_questions} 道题目")
            print(f"   📏 平均题目长度: {avg_question_length:.1f} 字符")
            print(f"   📝 平均解释长度: {avg_explanation_length:.1f} 字符")
            
            return result
            
        except json.JSONDecodeError as e:
            print(f"❌ JSON解析失败: {e}")
            print(f"原始响应前200字符: {response_text[:200]}...")
            return []
        except Exception as e:
            print(f"❌ 解析AI响应失败: {e}")
            print(f"原始响应前200字符: {response_text[:200]}...")
            return []
