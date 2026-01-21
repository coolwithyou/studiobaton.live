"use client";

import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function MarkdownGuideDialog() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 px-2 text-muted-foreground">
          <HelpCircle className="h-4 w-4 mr-1" />
          작성 가이드
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>마크다운 작성 가이드</DialogTitle>
          <DialogDescription>
            포스트 작성 시 사용할 수 있는 마크다운 문법과 확장 기능입니다.
          </DialogDescription>
        </DialogHeader>

        <Tabs defaultValue="basic" className="mt-4">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="basic">기본 문법</TabsTrigger>
            <TabsTrigger value="image">이미지</TabsTrigger>
            <TabsTrigger value="code">코드</TabsTrigger>
            <TabsTrigger value="alerts">알림</TabsTrigger>
          </TabsList>

          {/* 기본 문법 */}
          <TabsContent value="basic" className="space-y-4 mt-4">
            <div className="space-y-3">
              <GuideItem
                title="제목"
                syntax={`# 제목 1\n## 제목 2\n### 제목 3`}
              />
              <GuideItem
                title="텍스트 스타일"
                syntax={`**굵게**\n*기울임*\n~~취소선~~`}
              />
              <GuideItem
                title="링크"
                syntax={`[링크 텍스트](https://example.com)`}
              />
              <GuideItem
                title="인용문"
                syntax={`> 인용문 내용`}
              />
              <GuideItem
                title="목록"
                syntax={`- 항목 1\n- 항목 2\n\n1. 번호 항목 1\n2. 번호 항목 2`}
              />
              <GuideItem
                title="구분선"
                syntax={`---`}
              />
            </div>
          </TabsContent>

          {/* 이미지 */}
          <TabsContent value="image" className="space-y-4 mt-4">
            <div className="space-y-3">
              <GuideItem
                title="기본 이미지"
                syntax={`![이미지 설명](https://example.com/image.jpg)`}
                description="기본적으로 100% 너비로 표시됩니다."
              />
              <GuideItem
                title="이미지 크기 조절"
                syntax={`![이미지 설명|50%](https://example.com/image.jpg)\n![이미지 설명|75%](https://example.com/image.jpg)\n![이미지 설명|100%](https://example.com/image.jpg)`}
                description="alt 텍스트 뒤에 |크기%를 붙여 너비를 조절합니다."
              />
              <GuideItem
                title="GIF 이미지"
                syntax={`![GIF 설명|50%](https://media.giphy.com/...)`}
                description="GIF는 기본 50% 크기로 표시됩니다. 에디터의 GIF 버튼으로 GIPHY에서 검색할 수 있습니다."
              />
              <GuideItem
                title="HTML figure 태그"
                syntax={`<figure data-size="100%">\n  <img src="https://example.com/image.jpg" alt="">\n  <figcaption>캡션 텍스트</figcaption>\n</figure>`}
                description="외부에서 복사한 figure 태그에 data-size 속성을 추가하여 크기를 조절합니다."
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">이미지 업로드</p>
              <p className="text-muted-foreground">
                에디터 상단의 📷 버튼을 클릭하거나 이미지를 드래그 앤 드롭하여 업로드할 수 있습니다.
                업로드된 이미지는 자동으로 마크다운 문법으로 삽입됩니다.
              </p>
            </div>
          </TabsContent>

          {/* 코드 */}
          <TabsContent value="code" className="space-y-4 mt-4">
            <div className="space-y-3">
              <GuideItem
                title="인라인 코드"
                syntax={"`코드`"}
              />
              <GuideItem
                title="코드 블록"
                syntax={"```javascript\nconst hello = 'world';\nconsole.log(hello);\n```"}
                description="언어를 지정하면 구문 강조가 적용됩니다. (javascript, typescript, python, bash 등)"
              />
              <GuideItem
                title="지원 언어"
                description="javascript, typescript, python, bash, json, css, html, markdown 등 대부분의 언어를 지원합니다."
              />
            </div>
          </TabsContent>

          {/* 알림 (GitHub Alerts) */}
          <TabsContent value="alerts" className="space-y-4 mt-4">
            <div className="space-y-3">
              <GuideItem
                title="참고 (Note)"
                syntax={`> [!NOTE]\n> 참고할 내용을 작성합니다.`}
                description="일반적인 정보나 참고 사항을 강조할 때 사용합니다."
              />
              <GuideItem
                title="팁 (Tip)"
                syntax={`> [!TIP]\n> 유용한 팁을 작성합니다.`}
                description="독자에게 도움이 되는 팁이나 조언을 제공할 때 사용합니다."
              />
              <GuideItem
                title="중요 (Important)"
                syntax={`> [!IMPORTANT]\n> 중요한 내용을 작성합니다.`}
                description="반드시 알아야 할 중요한 정보를 강조할 때 사용합니다."
              />
              <GuideItem
                title="주의 (Warning)"
                syntax={`> [!WARNING]\n> 주의할 내용을 작성합니다.`}
                description="잠재적인 문제나 주의가 필요한 상황을 알릴 때 사용합니다."
              />
              <GuideItem
                title="경고 (Caution)"
                syntax={`> [!CAUTION]\n> 위험한 내용을 작성합니다.`}
                description="심각한 위험이나 부정적인 결과를 경고할 때 사용합니다."
              />
            </div>

            <div className="p-3 bg-muted/50 rounded-lg text-sm">
              <p className="font-medium mb-2">사용 예시</p>
              <p className="text-muted-foreground">
                GitHub 스타일의 알림 블록입니다. 인용문({">"}) 시작 후 [!TYPE]을 입력하고
                다음 줄에 내용을 작성하세요. 여러 줄 작성 시 각 줄 앞에 {">"} 를 붙입니다.
              </p>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

interface GuideItemProps {
  title: string;
  syntax?: string;
  description?: string;
}

function GuideItem({ title, syntax, description }: GuideItemProps) {
  return (
    <div className="border rounded-lg p-3">
      <h4 className="font-medium text-sm mb-2">{title}</h4>
      {syntax && (
        <pre className="bg-muted p-2 rounded text-xs font-mono whitespace-pre-wrap overflow-x-auto">
          {syntax}
        </pre>
      )}
      {description && (
        <p className="text-xs text-muted-foreground mt-2">{description}</p>
      )}
    </div>
  );
}
