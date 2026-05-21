from import_worker.csv_import import build_import_from_csv


def test_build_import_from_csv_uses_existing_api_file_keys() -> None:
    imported = build_import_from_csv(
        {
            "summaryFile": "".join(
                [
                    "topic,Test conversation\n",
                    "voters,2\n",
                    "voters-in-conv,2\n",
                    "commenters,1\n",
                    "comments,1\n",
                    "groups,0\n",
                    "conversation-description,Body\n",
                ],
            ),
            "commentsFile": "".join(
                [
                    "timestamp,datetime,comment-id,author-id,agrees,disagrees,moderated,",
                    "comment-body\n",
                    "1,2024-01-01,10,7,1,0,0,Hello\n",
                ],
            ),
            "votesFile": "".join(
                [
                    "timestamp,datetime,comment-id,voter-id,vote\n",
                    "1,2024-01-01,10,7,1\n",
                    "2,2024-01-02,10,8,-1\n",
                    "3,2024-01-03,10,8,1\n",
                ],
            ),
        },
    )

    assert imported.conversation_data.topic == "Test conversation"
    assert imported.comments_data[0].statement_id == 10
    assert len(imported.votes_data) == 2
    assert imported.votes_data[1].participant_id == 8
    assert imported.votes_data[1].vote == 1
