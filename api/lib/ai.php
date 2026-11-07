<?php
declare(strict_types=1);

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\RateLimitException;
use Anthropic\Messages\JSONOutputFormat;
use Anthropic\Messages\OutputConfig;

// Claude reads an email that came in without a tag (or with a short one) and decides where it belongs.
// It also writes titles, summaries and photo captions in the church's voice.

const AI_SYSTEM = <<<TXT
You prepare website updates for Potter's House Outreach Ministries International (PHOMI), a church in Burweta, Butebo District, Eastern Uganda. Church members email updates to the website. For each email, decide what kind of update it is and fill in the fields for the website.

Kinds:
- sermon: a message preached, with a title, preacher, scripture, date, notes, audio, video or a YouTube/Facebook link.
- photo: pictures for the gallery. Gallery categories: Worship, Outreach, Special service, Bible Study, Fellowship, Building.
- event: something happening on a date (crusade, conference, youth day, special service).
- announcement: short news for the home page (change of plan, notice, thanks).
- times: a change to the weekly service, prayer or Bible study times.
- testimony: a member's story of what God has done.
- other: anything that is not a website update (personal mail, spam, questions). Never publish these.

Write warmly and plainly, in British English, as the church would write about itself. Keep to what the email says: never invent names, dates, places or Bible verses. If a field is not in the email, leave it empty. Bible study at PHOMI is free; never mention fees or a school programme. Captions are one short sentence each, describing what can be seen, in the order the photos were attached. Set confident to false if you are unsure which kind it is or if the email might not be meant for the website.
TXT;

function ai_schema(): array
{
    $s = ['type' => 'string'];
    return [
        'type' => 'object',
        'properties' => [
            'kind' => ['type' => 'string', 'enum' => ['sermon', 'photo', 'event', 'announcement', 'times', 'testimony', 'other']],
            'confident' => ['type' => 'boolean'],
            'reason' => ['type' => 'string', 'description' => 'One sentence on why this kind was chosen'],
            'title' => $s,
            'summary' => ['type' => 'string', 'description' => 'Sermon notes, event details, announcement text or testimony, tidied but faithful to the email'],
            'preacher' => $s,
            'scripture' => $s,
            'date' => ['type' => 'string', 'description' => 'YYYY-MM-DD, or empty'],
            'time' => ['type' => 'string', 'description' => 'HH:MM 24-hour, or empty'],
            'venue' => $s,
            'event_kind' => $s,
            'category' => ['type' => 'string', 'enum' => ['', 'Worship', 'Outreach', 'Special service', 'Bible Study', 'Fellowship', 'Building']],
            'captions' => ['type' => 'array', 'items' => $s],
            'times' => [
                'type' => 'object',
                'properties' => ['sunday' => $s, 'prayer_day' => $s, 'prayer_time' => $s, 'bible_day' => $s, 'bible_time' => $s],
                'required' => ['sunday', 'prayer_day', 'prayer_time', 'bible_day', 'bible_time'],
                'additionalProperties' => false,
            ],
        ],
        'required' => ['kind', 'confident', 'reason', 'title', 'summary', 'preacher', 'scripture', 'date', 'time', 'venue', 'event_kind', 'category', 'captions', 'times'],
        'additionalProperties' => false,
    ];
}

function ai_available(): bool
{
    return class_exists(Client::class) && (string)(config('anthropic')['api_key'] ?? '') !== '';
}

/**
 * @param string $hint The tag the sender used, if any (sermon, photo, ...)
 * @param array $images JPEG bytes of up to 4 photos (already resized)
 * @return array|null The fields, or null if Claude could not be reached
 */
function ai_read_email(string $subject, string $text, array $files, array $images, string $hint = ''): ?array
{
    if (!ai_available()) return null;
    $cfg = config('anthropic');
    $client = new Client(apiKey: $cfg['api_key']);

    $list = $files ? implode("\n", array_map(fn($f) => "- {$f['filename']} ({$f['mime']})", $files)) : '(none)';
    $today = date('l j F Y');
    $prompt = "Today is $today.\n" . ($hint ? "The sender tagged this email as: $hint\n" : "The sender did not tag this email.\n")
        . "\nSubject: $subject\n\nAttachments:\n$list\n\nEmail text:\n" . mb_substr($text, 0, 12000);

    $content = [];
    foreach (array_slice($images, 0, 4) as $jpg) {
        $content[] = ['type' => 'image', 'source' => ['type' => 'base64', 'mediaType' => 'image/jpeg', 'data' => base64_encode($jpg)]];
    }
    $content[] = ['type' => 'text', 'text' => $prompt];

    try {
        $message = $client->messages->create(
            model: (string)($cfg['model'] ?? 'claude-opus-5-5'),
            maxTokens: 8000,
            system: AI_SYSTEM,
            messages: [['role' => 'user', 'content' => $content]],
            outputConfig: OutputConfig::with(effort: 'low', format: JSONOutputFormat::with(schema: ai_schema())),
        );
    } catch (AuthenticationException $e) {
        error_log('PHOMI AI: the Anthropic API key was refused');
        return null;
    } catch (RateLimitException | APIConnectionException $e) {
        error_log('PHOMI AI: temporarily unavailable: ' . $e->getMessage());
        return null;
    } catch (APIException $e) {
        error_log('PHOMI AI: ' . $e->getMessage());
        return null;
    }

    if ($message->stopReason === 'refusal') return null;
    foreach ($message->content as $block) {
        if ($block->type === 'text') {
            $data = json_decode($block->text, true);
            return is_array($data) ? $data : null;
        }
    }
    return null;
}
