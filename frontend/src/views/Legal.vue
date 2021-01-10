<template>
  <div class="mt-4">
    <h2>Legal Notice</h2>
    <p>For inquiries, please contact <a href="mailto:cards@martinzuern.de">cards@martinzuern.de</a>.</p>

    <h4 class="mt-5">Third party libraries</h4>
    <p>To get a list of the third party libraries used by this application, click on the link below.</p>
    <ul>
      <li><a href="/licenses/frontend.txt" target="_blank">Frontend</a></li>
      <li><a href="/licenses/backend.txt" target="_blank">Backend</a></li>
    </ul>

    <h4 class="mt-5">Privacy Policy</h4>
    <p>
      At Cards Offending Mankind, accessible from https://mankind.cards, one of our main priorities is the privacy of
      our visitors. This Privacy Policy document contains types of information that is collected and recorded by Cards
      Offending Mankind and how we use it.
    </p>

    <p>
      If you have additional questions or require more information about our Privacy Policy, do not hesitate to contact
      us. Our Privacy Policy was generated with the help of
      <a href="https://www.gdprprivacynotice.com/">GDPR Privacy Policy Generator from GDPRPrivacyNotice.com</a>
    </p>

    <h6>General Data Protection Regulation (GDPR)</h6>
    <p>We are a Data Controller of your information.</p>

    <p>
      Cards Offending Mankind legal basis for collecting and using the personal information described in this Privacy
      Policy depends on the Personal Information we collect and the specific context in which we collect the
      information:
    </p>
    <ul>
      <li>Cards Offending Mankind needs to perform a contract with you</li>
      <li>You have given Cards Offending Mankind permission to do so</li>
      <li>Processing your personal information is in Cards Offending Mankind legitimate interests</li>
      <li>Cards Offending Mankind needs to comply with the law</li>
    </ul>

    <p>
      Cards Offending Mankind will retain your personal information only for as long as is necessary for the purposes
      set out in this Privacy Policy. We will retain and use your information to the extent necessary to comply with our
      legal obligations, resolve disputes, and enforce our policies.
    </p>

    <p>
      If you are a resident of the European Economic Area (EEA), you have certain data protection rights. If you wish to
      be informed what Personal Information we hold about you and if you want it to be removed from our systems, please
      contact us.
    </p>
    <p>In certain circumstances, you have the following data protection rights:</p>
    <ul>
      <li>The right to access, update or to delete the information we have on you.</li>
      <li>The right of rectification.</li>
      <li>The right to object.</li>
      <li>The right of restriction.</li>
      <li>The right to data portability</li>
      <li>The right to withdraw consent</li>
    </ul>

    <h6>Log Files</h6>
    <p>
      Cards Offending Mankind follows a standard procedure of using log files. These files log visitors when they visit
      websites. All hosting companies do this and a part of hosting services' analytics. The information collected by
      log files include internet protocol (IP) addresses, browser type, Internet Service Provider (ISP), date and time
      stamp, referring/exit pages, and possibly the number of clicks. These are not linked to any information that is
      personally identifiable.
    </p>
    <p>We delete games after 24 hours, logs after 7 days.</p>

    <h6>Cookies and Web Beacons</h6>
    <p>
      Like any other website, Cards Offending Mankind uses 'cookies'. These cookies are used to store information
      including visitors' preferences, and the pages on the website that the visitor accessed or visited. The
      information is used to optimize the users' experience by customizing our web page content based on visitors'
      browser type and/or other information.
    </p>
    <p>
      For more general information on cookies, please read
      <a href="https://www.cookieconsent.com/what-are-cookies/">"What Are Cookies"</a>.
    </p>

    <h6>Hosting by Heroku</h6>
    <p>
      We use the services of Heroku, in the Europe region. We have no knowledge of the further type of processing and
      duration of storage. We cannot rule out the possibility that data will be transmitted to the United States, which
      is deemed to be a third country with an unsecure level of data protection under the GDPR. You can find further
      information on the use of data by Heroku in Heroku’s data protection notice:
      <a href="https://www.salesforce.com/company/privacy/">https://www.salesforce.com/company/privacy/</a>. The legal
      basis is our legitimate interest in the operation and assurance of the operational security of this website, in
      accordance with Art. 6 Abs. 1 sentence 1 letter (f) GDPR.
    </p>

    <h6>Error tracking by Sentry</h6>
    <p>
      We use the services of Sentry for tracking of errors that occur during the use of Cards Offending Mankind. We have
      no knowledge of the further type of processing and duration of storage. We cannot rule out the possibility that
      data will be transmitted to the United States, which is deemed to be a third country with an unsecure level of
      data protection under the GDPR. You can find further information on the use of data by Sentry in Sentry's data
      protection notice:
      <a href="https://sentry.io/legal/privacy/2.2.1/">https://sentry.io/legal/privacy/2.2.1/</a>. The legal basis is
      our legitimate interest in the operation and assurance of the operational security of this website, in accordance
      with Art. 6 Abs. 1 sentence 1 letter (f) GDPR.
    </p>

    <h6>Children's Information</h6>
    <p>
      Another part of our priority is adding protection for children while using the internet. We encourage parents and
      guardians to observe, participate in, and/or monitor and guide their online activity.
    </p>
    <p>
      Cards Offending Mankind does not knowingly collect any Personal Identifiable Information from children under the
      age of 13. If you think that your child provided this kind of information on our website, we strongly encourage
      you to contact us immediately and we will do our best efforts to promptly remove such information from our
      records.
    </p>

    <h6>Consent</h6>
    <p>By using our website, you hereby consent to our Privacy Policy and agree to its terms.</p>

    <!-- GitHub icon -->
    <GitHubCorners repo="martinzuern/cards-offending-mankind" />
  </div>
</template>

<script lang="ts">
import Vue from 'vue';
import GitHubCorners from '@/components/GitHubCorners.vue';

export default Vue.extend({
  name: 'Legal',
  components: {
    GitHubCorners,
  },
});
</script>
