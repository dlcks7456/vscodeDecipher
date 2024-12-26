# Decipher VS Code Package_NIQ KOR SUD:Chan.lee

> Version : **1.0.0**

| ShortCut         | Feature                      | Description                                      | UseFormat |
| :--------------- | :--------------------------- | ------------------------------------------------ | --------- |
| `ctrl+r`         | make_radio                   | **SA 문항 생성**                                 | O         |
| `ctrl+shift+r`   | make_rating                  | **척도 문항 생성**                               | O         |
| `ctrl+shift+c`   | make_checkbox                | **MA 문항 생성**                                 | O         |
| `ctrl+shift+s`   | make_select                  | **Select Box 생성**                              | O         |
| `ctrl+shift+t`   | make_textarea                | **주관식(TextArea)**                             | O         |
| `ctrl+t`         | make_text                    | **주관식(Text)**                                 | O         |
| `ctrl+n`         | make_number                  | **숫자 응답 문항**                               | O         |
| `ctrl+shift+f`   | make_float                   | **소수점 응답 문항**                             | O         |
| `ctrl+p`         | make_pipe                    | **[pipe: ] 로직 변환**                           |           |
| `ctrl+1`         | make_row                     | **속성 생성(row)**                               | O         |
| `ctrl+shift+1`   | make_row_auto_value          | **속성과 value 생성 (row) - 순차 적용**          | O         |
| `ctrl+2`         | make_cols                    | **컬럼 생성 (col)**                              | O         |
| `ctrl+shift+2`   | make_col_auto_value          | **속성과 value 생성 (col) - 순차 적용**          | O         |
| `ctrl+3`         | make_choices                 | **Select에 사용되는 속성 생성 (choice)**         | O         |
| `ctrl+shift+3`   | make_choice_auto_value       | **속성과 value 생성 (choice) - 순차 적용**       | O         |
| `ctrl+4`         | make_cases                   | **pipe 로직에 사용되는 case 생성**               | O         |
| `ctrl+5`         | make_groups                  | **group 생성**                                   | O         |
| `ctrl+6`         | make_loop_block              | **loop block 생성**                              |           |
| `ctrl+7`         | make_cols_match_value        | **Value와 매칭하여 컬럼 생성**                   | O         |
| `ctrl+8`         | make_cols_match_label        | **라벨과 매칭하여 컬럼을 생성**                  | O         |
| `ctrl+9`         | make_rows_match_label        | **라벨과 매칭하여 속성을 생성**                  | O         |
| `ctrl+shift+h`   | make_comment                 | **html 태그 페이지 생성**                        |           |
| `ctrl+shift+f12` | make_switch                  | **row ↔ col 스위칭**                             | O         |
| `ctrl+shift+8`   | make_cols_with_group         | **1개 group에 컬럼 생성(col/group)**             |           |
| `ctrl+b`         | make_strong                  | **Bold Text**                                    |           |
| `ctrl+shift+b`   | make_strong_color            | **Bold Text with Color**                         |           |
| `ctrl+u`         | make_underline               | **Underline Text**                               |           |
| `ctrl+shift+v`   | make_video                   | **Video 문항 생성**                              | O         |
| `ctrl+shift+g`   | make_rows_match_values_group | **group과 row 매칭하여 생성**                    |           |
| `ctrl+0`         | change_label_code            | **우측에 작성되어 있는 코드 좌측 전환**          | O         |
| `ctrl+shift+7`   | grid_col                     | **척도 라벨 정리**                               | O         |
| `ctrl+shift+q`   | make_quota                   | **Quota 조합 생성**                              | O         |
| `ctrl+q`         | make_qname                   | **qname class 생성**                             |           |
| `ctrl+shift+f7`  | make_dcm_res                 | **Conjoint Label 생성**                          | O         |
| `ctrl+shift+f8`  | make_maxdiff_res             | **MaxDiff Label 생성**                           | O         |
| `ctrl+shift+l`   | loop_label                   | **[loopvar: label] 생성**                        |           |
| `ctrl+shift+e`   | entity                       | **엔티티 형태로 전환**                           |           |
| `ctrl+m`         | split_context                | **물음표를 기준으로 `<br/>` 태그를 추가**        |           |
| `ctrl+shift+m`   | split_comment                | **각각의 문장을 `<p>`태그로 감싼 문장으로 변경** |           |
| `ctrl+shift+6`   | make_looprow                 | **looprow 생성**                                 | O         |
| `ctrl+alt+6`     | [[make_looprow_macro]]       | **looprow를 매크로 형식으로 생성**               | O         |

> [!error] Format이 있는 단축키는 정해져있는 형태를 입력 후 반영할 텍스트를 모두 선택해서 사용

### 📌 Attribute Format

##### None-value

```
Attr1
Attr2
```

> [!info] 각 속성은 줄 바꿈으로 구분

###### Example

```xml
남성
여성

<!-- ctrl+1 -->
  <row label="r1">남성</row>
  <row label="r2">여성</row>

<!-- ctrl+shift+1 -->
  <row label="r1" value="1">남성</row>
  <row label="r2" value="2">여성</row>

<!-- ctrl+2 -->
  <col label="c1">남성</col>
  <col label="c2">여성</col>

<!-- ctrl+3 -->
  <choice label="ch1">남성</choice>
  <choice label="ch2">여성</choice>

<!-- ctrl+5 -->
  <group label="g1">남성</group>
  <group label="g2">여성</group>
```

##### Use-value

```
1 Attr1
2 Attr2
```

> [!info] value와 함께 구현하는 경우 value 입력 후 한 칸 띄우고 텍스트 입력
> 동일하게 줄바꿈으로 속성 구분

###### Example

```xml
1 남성
2 여성

<!-- ctrl+7 -->
  <col label="c1" value="1">남성</col>
  <col label="c2" value="2">여성</col>
```

### 📌 Question Format

```xml
[ALT]
QID TITLE
ATTRIBUTES
```

- `ALT` : 대괄호로 묶인 상태로 작성 _(optional)_
- `QID` : 변수이름
- `TITLE` : 문항 워딩
- `ATTRIBUTES` : row/col/choice/group 등의 태그

###### example

```xml
<!-- 1. 기본 형태 입력 -->
[성별]
SQ2 귀하의 성별은 무엇입니까?
남성      1
여성      2


<!-- 2. label/value 스위칭 : ctrl+0 -->
[성별]
SQ2 귀하의 성별은 무엇입니까?
1   남성
2   여성


<!-- 3. row/col/choice/group 생성 : ctrl+7 -->
[성별]
SQ2 귀하의 성별은 무엇입니까?
  <col label="c1" value="1">남성</col>
  <col label="c2" value="2">여성</col>


<!-- 4. col를 row로 전환 : ctrl+shift_f12 -->
[성별]
SQ2 귀하의 성별은 무엇입니까?
  <row label="r1" value="1">남성</row>
  <row label="r2" value="2">여성</row>


<!-- 5. 문항 생성 : ctrl+r -->
<radio
  label="SQ2">
  <alt>성별</alt>
  <title><div class="q-name">SQ2</div> 귀하의 성별은 무엇입니까?</title>
  <comment></comment>
  <row label="r1" value="1">남성</row>
  <row label="r2" value="2">여성</row>
</radio>
<suspend/>
```
